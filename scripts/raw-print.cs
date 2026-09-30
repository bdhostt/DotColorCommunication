using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class RawPrinterProgram {
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
        if (string.IsNullOrEmpty(devicePath)) return false;
        SafeFileHandle handle = CreateFile(devicePath, 0x40000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
        if (handle.IsInvalid) return false;
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

    public static bool SendBytesToSpooler(string szPrinterName, byte[] bytes) {
        if (string.IsNullOrEmpty(szPrinterName)) return false;
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

    public static int Main(string[] args) {
        if (args.Length < 2) {
            Console.Error.WriteLine("Usage: raw-print.exe <PrinterName> <FilePath> [UsbDevicePath]");
            return 1;
        }
        string printerName = args[0];
        string filePath = args[1];
        string usbDevicePath = args.Length >= 3 ? args[2] : "";

        if (!File.Exists(filePath)) {
            Console.Error.WriteLine("File not found: " + filePath);
            return 1;
        }

        byte[] bytes = File.ReadAllBytes(filePath);

        // 1. Instant Direct USB Device Write (<10ms, zero spooler delay)
        if (!string.IsNullOrEmpty(usbDevicePath)) {
            if (SendBytesToDevicePath(usbDevicePath, bytes)) {
                Console.WriteLine("SUCCESS_DIRECT_USB:" + usbDevicePath);
                return 0;
            }
        }

        // 2. Instant Win32 Spooler RAW Write (<15ms)
        if (SendBytesToSpooler(printerName, bytes)) {
            Console.WriteLine("SUCCESS_SPOOLER:" + printerName);
            return 0;
        }

        // 3. Fallback to "80 Printer" if different name was passed
        if (!string.Equals(printerName, "80 Printer", StringComparison.OrdinalIgnoreCase)) {
            if (SendBytesToSpooler("80 Printer", bytes)) {
                Console.WriteLine("SUCCESS_SPOOLER:80 Printer");
                return 0;
            }
        }

        Console.Error.WriteLine("PRINT_FAILED");
        return 2;
    }
}
