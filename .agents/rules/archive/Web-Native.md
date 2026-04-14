---
name: web_native
description: "Strict enforcement of Web Browser Sandbox constraints against native/mobile API hallucinations."
trigger: always_on
---

# Web Native Exclusivity Rule

Because this application runs entirely within a Vanilla JS Browser environment, you must strictly adhere to the Browser Sandbox constraints. You are forbidden from attempting to use native mobile, Node.js, or desktop-level APIs.

1. **Hardware & Bluetooth**:
   - NEVER suggest or import Node.js or React Native Bluetooth libraries (like `noble` or `react-native-ble-plx`).
   - All hardware interaction must strictly use the native browser **Web Bluetooth API** (`navigator.bluetooth`).

2. **Storage & Databases**:
   - NEVER attempt to use native file system modules (`fs`), local SQLite wrappers, or mobile secure enclaves.
   - For local data persistence, you must strictly use **LocalStorage**, **SessionStorage**, or **IndexedDB**.
   - Remote database interactions must be done via the Supabase JS Client over standard HTTPS.

3. **Networking & CORS**:
   - Remember that we are bound by browser CORS policies. 
   - NEVER write proxy logic or raw TCP/UDP socket code that relies on Node.js native `net` or `dgram` modules. Use standard `fetch()`, WebSockets, or the Supabase client.
