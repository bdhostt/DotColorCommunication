param(
    [Parameter(Mandatory=$false)][string]$PrinterName = "80 Printer",
    [Parameter(Mandatory=$true)][string]$FilePath
)

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern SafeFileHandle CreateFile(
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        IntPtr lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile
    );

    public static bool SendBytesToDevicePath(string devicePath, byte[] bytes) {
        // GENERIC_WRITE = 0x40000000, FILE_SHARE_READ | FILE_SHARE_WRITE = 3, OPEN_EXISTING = 3
        SafeFileHandle handle = CreateFile(devicePath, 0x40000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
        if (handle.IsInvalid) {
            return false;
        }
        try {
            using (FileStream fs = new FileStream(handle, FileAccess.Write)) {
                fs.Write(bytes, 0, bytes.Length);
                fs.Flush();
                return true;
            }
        } catch {
            return false;
        } finally {
            if (!handle.IsClosed) handle.Close();
        }
    }

    public static bool SendBytes(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "POS Thermal Ticket";
        di.pDataType = "RAW";

        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) return false;
        try {
            if (!StartDocPrinter(hPrinter, 1, di)) return false;
            try {
                if (!StartPagePrinter(hPrinter)) return false;
                try {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    try {
                        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                        int dwWritten = 0;
                        return WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    } finally {
                        Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    }
                } finally {
                    EndPagePrinter(hPrinter);
                }
            } finally {
                EndDocPrinter(hPrinter);
            }
        } finally {
            ClosePrinter(hPrinter);
        }
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'RawPrinter').Type) {
    Add-Type -TypeDefinition $code -Language CSharp
}

if (-not (Test-Path -Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

$bytes = [System.IO.File]::ReadAllBytes($FilePath)

# 1. Check physically connected USB Printing Support devices (usbprint.sys)
$usbPrintDevices = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Service -eq 'usbprint' -and $_.Status -eq 'OK' })
$isUsbConnected = ($usbPrintDevices.Count -gt 0)

# 2. Discover installed Windows Printers (excluding virtual document printers)
$virtualRegex = 'Microsoft Print to PDF|XPS Document Writer|OneNote|Fax|Adobe PDF|Foxit|Send To|AnyDesk'
$realPrinters = @(Get-Printer -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch $virtualRegex })

# 3. If a physical USB thermal printer is plugged into THIS computer right now:
if ($isUsbConnected) {
    # 3a. Try direct hardware USB write via GUID_DEVINTERFACE_USBPRINT ({28d78fad-5a12-11d1-ae5b-0000f803a8c2})
    # This works 100% plug-and-play on ANY Windows PC even WITHOUT installing a printer driver!
    foreach ($dev in $usbPrintDevices) {
        $devPath = "\\?\" + ($dev.InstanceId -replace '\\', '#') + "#{28d78fad-5a12-11d1-ae5b-0000f803a8c2}"
        if ([RawPrinter]::SendBytesToDevicePath($devPath, $bytes)) {
            Write-Output "SUCCESS_DIRECT_USB:$($dev.InstanceId)"
            exit 0
        }
    }

    # 3b. Fallback to installed Windows Printer mapped to a USB port (e.g. USB001, USB002)
    $usbQueue = $realPrinters | Where-Object { $_.PortName -match '^USB' } | Select-Object -First 1
    if ($usbQueue) {
        if ([RawPrinter]::SendBytes($usbQueue.Name, $bytes)) {
            Write-Output "SUCCESS_WIN_USB:$($usbQueue.Name)"
            exit 0
        }
    }
}

# 4. Check if there is an installed Network/LAN Printer queue (IP_*, 192.168.*, WSD*)
$lanQueue = $realPrinters | Where-Object { $_.PortName -match '^(IP_|192\.|10\.|172\.|WSD)' -and -not $_.WorkOffline } | Select-Object -First 1
if ($lanQueue) {
    if ([RawPrinter]::SendBytes($lanQueue.Name, $bytes)) {
        Write-Output "SUCCESS_WIN_LAN:$($lanQueue.Name)"
        exit 0
    }
}

# 5. Only try requested PrinterName if it is NOT a disconnected USB printer and NOT a virtual printer
if ($PrinterName -and ($PrinterName -notmatch $virtualRegex)) {
    $matchedPrinter = $realPrinters | Where-Object { $_.Name -eq $PrinterName } | Select-Object -First 1
    if ($matchedPrinter) {
        # If this printer uses a USB port, DO NOT spool to it when $isUsbConnected is false!
        # Otherwise an unplugged PC will swallow jobs into its offline Windows spooler!
        if (($matchedPrinter.PortName -match '^USB') -and (-not $isUsbConnected)) {
            Write-Error "USB_PRINTER_UNPLUGGED: Printer '$PrinterName' on $($matchedPrinter.PortName) is physically disconnected from this PC."
            exit 2
        }
        if ([RawPrinter]::SendBytes($matchedPrinter.Name, $bytes)) {
            Write-Output "SUCCESS:$($matchedPrinter.Name)"
            exit 0
        }
    }
}

Write-Error "NO_ACTIVE_PRINTER: No physically connected USB or reachable LAN printer found on this PC."
exit 2
