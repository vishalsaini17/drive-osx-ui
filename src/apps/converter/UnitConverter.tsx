import React, { useMemo, useState } from "react";
import { ArrowRightLeft, Info, Scale } from "lucide-react";
import { useContainerWidth } from "../../platform/layout/useContainerWidth";
import type { ConverterCategory, UnitDefinition } from "./types";

const LENGTH_UNITS: UnitDefinition[] = [
  { id: "m", name: "Meters", symbol: "m", ratioToBase: 1 },
  { id: "km", name: "Kilometers", symbol: "km", ratioToBase: 1000 },
  { id: "cm", name: "Centimeters", symbol: "cm", ratioToBase: 0.01 },
  { id: "mm", name: "Millimeters", symbol: "mm", ratioToBase: 0.001 },
  { id: "mi", name: "Miles", symbol: "mi", ratioToBase: 1609.344 },
  { id: "yd", name: "Yards", symbol: "yd", ratioToBase: 0.9144 },
  { id: "ft", name: "Feet", symbol: "ft", ratioToBase: 0.3048 },
  { id: "in", name: "Inches", symbol: "in", ratioToBase: 0.0254 },
  { id: "nmi", name: "Nautical Miles", symbol: "nmi", ratioToBase: 1852 },
];

const WEIGHT_UNITS: UnitDefinition[] = [
  { id: "kg", name: "Kilograms", symbol: "kg", ratioToBase: 1 },
  { id: "g", name: "Grams", symbol: "g", ratioToBase: 0.001 },
  { id: "mg", name: "Milligrams", symbol: "mg", ratioToBase: 0.000001 },
  { id: "lb", name: "Pounds", symbol: "lb", ratioToBase: 0.45359237 },
  { id: "oz", name: "Ounces", symbol: "oz", ratioToBase: 0.028349523125 },
  { id: "t", name: "Metric Tons", symbol: "t", ratioToBase: 1000 },
  { id: "st", name: "Stones", symbol: "st", ratioToBase: 6.35029 },
];

const STORAGE_UNITS: UnitDefinition[] = [
  { id: "b", name: "Bits", symbol: "b", ratioToBase: 0.125 },
  { id: "B", name: "Bytes", symbol: "B", ratioToBase: 1 },
  { id: "KB", name: "Kilobytes", symbol: "KB", ratioToBase: 1024 },
  { id: "MB", name: "Megabytes", symbol: "MB", ratioToBase: 1024 * 1024 },
  {
    id: "GB",
    name: "Gigabytes",
    symbol: "GB",
    ratioToBase: 1024 * 1024 * 1024,
  },
  {
    id: "TB",
    name: "Terabytes",
    symbol: "TB",
    ratioToBase: 1024 * 1024 * 1024 * 1024,
  },
  {
    id: "PB",
    name: "Petabytes",
    symbol: "PB",
    ratioToBase: 1024 * 1024 * 1024 * 1024 * 1024,
  },
];

// Reference values only. This app deliberately makes no network request for
// exchange rates, so these values do not claim to be live market data.
const CURRENCY_UNITS: UnitDefinition[] = [
  { id: "USD", name: "US Dollar", symbol: "$", ratioToBase: 1 },
  { id: "EUR", name: "Euro", symbol: "€", ratioToBase: 1.09 },
  { id: "GBP", name: "British Pound", symbol: "£", ratioToBase: 1.27 },
  { id: "JPY", name: "Japanese Yen", symbol: "¥", ratioToBase: 0.0065 },
  { id: "CAD", name: "Canadian Dollar", symbol: "C$", ratioToBase: 0.74 },
  { id: "AUD", name: "Australian Dollar", symbol: "A$", ratioToBase: 0.65 },
  { id: "INR", name: "Indian Rupee", symbol: "₹", ratioToBase: 0.012 },
  { id: "CNY", name: "Chinese Yuan", symbol: "¥", ratioToBase: 0.14 },
  { id: "CHF", name: "Swiss Franc", symbol: "Fr", ratioToBase: 1.13 },
  { id: "BTC", name: "Bitcoin (Crypto)", symbol: "₿", ratioToBase: 65000 },
];
const ENCRYPTION_METHODS = [
  { id: "AES-256-GCM", name: "AES-256-GCM" },
  { id: "BASE64", name: "Base64" },
];

const CATEGORIES: { id: ConverterCategory; name: string }[] = [
  { id: "length", name: "Length" },
  { id: "weight", name: "Weight" },
  { id: "temperature", name: "Temp" },
  { id: "currency", name: "Currency" },
  { id: "storage", name: "Storage" },
  { id: "encryption", name: "Encrypt / Decrypt" },
];
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const deriveEncryptionKey = async (password: string, salt: BufferSource) => {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
};
export default function UnitConverter() {
  const { ref: containerRef, isCompact } =
    useContainerWidth<HTMLDivElement>(620);
  const [category, setCategory] = useState<ConverterCategory>("length");
  const [inputValue, setInputValue] = useState<string>("1");
  const [fromUnitId, setFromUnitId] = useState<string>("m");
  const [toUnitId, setToUnitId] = useState<string>("ft");
  const [encryptionMode, setEncryptionMode] = useState<"encrypt" | "decrypt">(
    "encrypt",
  );
  const [encryptionMethod, setEncryptionMethod] = useState("AES-256-GCM");
  const [encryptionText, setEncryptionText] = useState("");
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [encryptionOutput, setEncryptionOutput] = useState("");

  const handleCategoryChange = (nextCategory: ConverterCategory) => {
    setCategory(nextCategory);
    if (nextCategory === "length") {
      setFromUnitId("m");
      setToUnitId("ft");
    } else if (nextCategory === "weight") {
      setFromUnitId("kg");
      setToUnitId("lb");
    } else if (nextCategory === "temperature") {
      setFromUnitId("C");
      setToUnitId("F");
    } else if (nextCategory === "currency") {
      setFromUnitId("USD");
      setToUnitId("EUR");
    } else if (nextCategory === "storage") {
      setFromUnitId("GB");
      setToUnitId("MB");
    } else if (nextCategory === "encryption") {
      setFromUnitId("");
      setToUnitId("");
    }
  };

  const activeUnitsList = useMemo(() => {
    switch (category) {
      case "length":
        return LENGTH_UNITS;
      case "weight":
        return WEIGHT_UNITS;
      case "currency":
        return CURRENCY_UNITS;
      case "storage":
        return STORAGE_UNITS;
      default:
        return [];
    }
  }, [category]);

  const convertedResult = useMemo(() => {
    const input = parseFloat(inputValue);
    if (Number.isNaN(input)) return "0";

    if (category === "temperature") {
      if (fromUnitId === toUnitId) return input.toString();
      let celsius = input;
      if (fromUnitId === "F") celsius = (input - 32) * (5 / 9);
      if (fromUnitId === "K") celsius = input - 273.15;

      if (toUnitId === "C") return celsius.toFixed(4);
      if (toUnitId === "F") return (celsius * (9 / 5) + 32).toFixed(4);
      if (toUnitId === "K") return (celsius + 273.15).toFixed(4);
      return "0";
    }

    const fromUnit = activeUnitsList.find((unit) => unit.id === fromUnitId);
    const toUnit = activeUnitsList.find((unit) => unit.id === toUnitId);
    if (!fromUnit || !toUnit) return "0";

    const result = (input * fromUnit.ratioToBase) / toUnit.ratioToBase;
    if (Math.abs(result) < 0.00001 && result !== 0)
      return result.toExponential(6);
    return parseFloat(result.toFixed(6)).toString();
  }, [activeUnitsList, category, fromUnitId, inputValue, toUnitId]);

  const handleSwap = () => {
    setFromUnitId(toUnitId);
    setToUnitId(fromUnitId);
  };
  const handleEncrypt = async () => {
    if (!encryptionText.trim() || !encryptionPassword) {
      setEncryptionOutput("Please enter text and password.");
      return;
    }

    try {
      const encoder = new TextEncoder();

      // Random salt + IV for every encryption
      const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

      const key = await deriveEncryptionKey(encryptionPassword, salt);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv.buffer as ArrayBuffer,
        },
        key,
        encoder.encode(encryptionText),
      );

      // Store: salt + IV + encrypted data
      const combined = new Uint8Array(
        SALT_LENGTH + IV_LENGTH + encrypted.byteLength,
      );

      combined.set(salt, 0);
      combined.set(iv, SALT_LENGTH);
      combined.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH);

      setEncryptionOutput(bytesToBase64(combined));
    } catch {
      setEncryptionOutput("Encryption failed.");
    }
  };
  const handleDecrypt = async () => {
    if (!encryptionText.trim() || !encryptionPassword) {
      setEncryptionOutput("Please enter encrypted text and password.");
      return;
    }

    try {
      const encryptedData = base64ToBytes(encryptionText);

      if (encryptedData.length <= SALT_LENGTH + IV_LENGTH) {
        setEncryptionOutput("Invalid encrypted data.");
        return;
      }

      const salt = encryptedData.slice(0, SALT_LENGTH);
      const iv = encryptedData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const ciphertext = encryptedData.slice(SALT_LENGTH + IV_LENGTH);

      const key = await deriveEncryptionKey(encryptionPassword, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
        },
        key,
        ciphertext,
      );

      const decoder = new TextDecoder();

      setEncryptionOutput(decoder.decode(decrypted));
    } catch {
      setEncryptionOutput(
        "Decryption failed. Check the password and encrypted text.",
      );
    }
  };
  const handleBase64 = () => {
    if (!encryptionText.trim()) {
      setEncryptionOutput("Please enter text.");
      return;
    }

    try {
      if (encryptionMode === "encrypt") {
        const bytes = new TextEncoder().encode(encryptionText);
        setEncryptionOutput(bytesToBase64(bytes));
      } else {
        const bytes = base64ToBytes(encryptionText.trim());
        const decoded = new TextDecoder().decode(bytes);
        setEncryptionOutput(decoded);
      }
    } catch {
      setEncryptionOutput("Base64 operation failed. Check the input format.");
    }
  };
  const displayedInput = inputValue.trim() || "0";
  const isEncryption = category === "encryption";
  const activeCategoryName =
    CATEGORIES.find((item) => item.id === category)?.name ?? "Unit";
  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col p-4 gap-4 max-w-2xl mx-auto w-full select-none overflow-y-auto"
    >
      <div
        className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-5"} gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs`}
      >
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            onClick={() => handleCategoryChange(item.id)}
            className={`py-2 px-3 rounded-xl font-bold cursor-pointer transition-all text-center ${
              category === item.id
                ? "bg-purple-600 text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
          <span className="font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            {isEncryption ? (
              <>🔐 Encrypt / Decrypt</>
            ) : (
              <>
                <Scale className="w-4 h-4" /> {activeCategoryName} Converter
              </>
            )}
          </span>
          {category === "currency" && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium whitespace-nowrap">
              Static reference rates
            </span>
          )}
        </div>
        {isEncryption && (
          <div
            className={`grid ${isCompact ? "grid-cols-1" : "grid-cols-2"} gap-3`}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">
                Method
              </span>
              <select
                value={encryptionMethod}
                onChange={(event) => setEncryptionMethod(event.target.value)}
                className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                {ENCRYPTION_METHODS.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">
                Action
              </span>
              <select
                value={encryptionMode}
                onChange={(event) =>
                  setEncryptionMode(event.target.value as "encrypt" | "decrypt")
                }
                className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                <option value="encrypt">Encrypt</option>
                <option value="decrypt">Decrypt</option>
              </select>
            </div>
          </div>
        )}

        {isEncryption ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">
                Text
              </span>

              <textarea
                value={encryptionText}
                onChange={(event) => setEncryptionText(event.target.value)}
                placeholder={
                  encryptionMode === "encrypt"
                    ? "Enter text to encrypt"
                    : "Paste encrypted Base64 text"
                }
                rows={7}
                className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-sm font-mono outline-none resize-y"
              />
            </div>

            {/* <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">
                Password
              </span>

              <input
                type="password"
                value={encryptionPassword}
                onChange={(event) => setEncryptionPassword(event.target.value)}
                placeholder="Enter password"
                className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-sm font-mono outline-none"
              />
            </div> */}
            {encryptionMethod === "AES-256-GCM" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">
                  Password
                </span>

                <input
                  type="password"
                  value={encryptionPassword}
                  onChange={(event) =>
                    setEncryptionPassword(event.target.value)
                  }
                  placeholder="Enter password"
                  className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-sm font-mono outline-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (encryptionMethod === "BASE64") {
                    handleBase64();
                  } else if (encryptionMode === "encrypt") {
                    void handleEncrypt();
                  } else {
                    void handleDecrypt();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors"
              >
                {encryptionMode === "encrypt" ? "🔐 Encrypt" : "🔓 Decrypt"}
              </button>

              <button
                onClick={() => {
                  setEncryptionText("");
                  setEncryptionPassword("");
                  setEncryptionOutput("");
                }}
                className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold"
              >
                Clear
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">
                Output
              </span>

              <textarea
                value={encryptionOutput}
                readOnly
                rows={7}
                placeholder="Result will appear here"
                className="w-full p-3 rounded-xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/30 text-sm font-mono outline-none resize-y"
              />
            </div>
          </div>
        ) : (
          <>
            {
              <div
                className={`grid ${isCompact ? "grid-cols-1" : "grid-cols-2"} gap-4 items-center relative`}
              >
                <div className="flex flex-col gap-1.5 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase">
                    From
                  </span>
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    className="w-full font-mono text-2xl font-bold bg-transparent outline-none text-zinc-900 dark:text-zinc-100"
                    placeholder="Enter value"
                  />
                  {category === "temperature" ? (
                    <select
                      value={fromUnitId}
                      onChange={(event) => setFromUnitId(event.target.value)}
                      className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
                    >
                      <option value="C">Celsius (°C)</option>
                      <option value="F">Fahrenheit (°F)</option>
                      <option value="K">Kelvin (K)</option>
                    </select>
                  ) : (
                    <select
                      value={fromUnitId}
                      onChange={(event) => setFromUnitId(event.target.value)}
                      className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
                    >
                      {activeUnitsList.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div
                  className={
                    isCompact
                      ? "flex justify-center"
                      : "flex justify-center absolute left-1/2 -translate-x-1/2 z-10"
                  }
                >
                  <button
                    onClick={handleSwap}
                    className="p-3 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Swap From and To units"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 p-3.5 bg-purple-500/5 dark:bg-purple-950/20 rounded-xl border border-purple-500/30">
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                    To (Result)
                  </span>
                  <div className="w-full font-mono text-2xl font-bold text-purple-600 dark:text-purple-300 truncate">
                    {convertedResult}
                  </div>
                  {category === "temperature" ? (
                    <select
                      value={toUnitId}
                      onChange={(event) => setToUnitId(event.target.value)}
                      className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-purple-500/30 text-xs font-semibold cursor-pointer"
                    >
                      <option value="C">Celsius (°C)</option>
                      <option value="F">Fahrenheit (°F)</option>
                      <option value="K">Kelvin (K)</option>
                    </select>
                  ) : (
                    <select
                      value={toUnitId}
                      onChange={(event) => setToUnitId(event.target.value)}
                      className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-purple-500/30 text-xs font-semibold cursor-pointer"
                    >
                      {activeUnitsList.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            }
          </>
        )}

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Info className="w-4 h-4 shrink-0 text-purple-500" />
          <span>
            Conversion: {displayedInput} {fromUnitId} = {convertedResult}{" "}
            {toUnitId}
          </span>
        </div>
      </div>
    </div>
  );
}
