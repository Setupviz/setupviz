// SetupViz product data, picks and fit rules, shared by the builder and the share page.
// All sizes are in mm. A mouse's w is its width and d its length.
//
// Product record:
// {
//   id, name,
//   brand, model, asin,            // asin is 10 characters. The tagged URL is built from it, not stored.
//   dims: { w, d, h }, dimsSource,  // manufacturer size, and the page it came from.
//                                   // A monitor's dims are the cabinet when the outline lists that apart from the stand.
//   w, d,                           // desk footprint. Monitor d is depth with the stand.
//   base,                           // monitors: stand base [w, d], not the assembled depth
//   kind,                           // pads: cloth | mat | glass
//   g, grips, hands,                // mice: weight in grams, grip styles, hand sizes
//   tagsSource,                     // 'editorial' when grips or hands are a judgment, not a maker spec
//   retired,                        // true keeps the product for old links, and drops it from sale
//   why, alt
// }
(function(){
  const { deskLimits, defaultDesk, deskFallbackNotice, plain, finiteNum, parseDeskInput, deskMm, deskAxisOk, deskOk, deskRangeMessage, deskField, savedDesk, measureText } = window.SVDesk;
  var catalog = {
    monitor: [
      { id: 'mon27', diagonalIn: 27, name: 'Dell 27 Plus QHD (S2725DS)', brand: 'Dell', model: 'S2725DS', asin: 'B0D3FGFPPB', w: 611, d: 200, base: [248, 180], dims: { w: 611.34, d: 200.38, h: 388.63 }, standShape: 'dell', panelDepth: 58.81, panelFrontPct: 70, dimsSource: 'https://dl.dell.com/content/manual2557420-dell-s2725ds-monitor-outline-dimensions.pdf?language=en-us', why: 'Sharp at desk distance, and the stand base is compact.', alt: 'All-round pick' , stockCheckedAt: '2026-10-17' },
      { id: 'mon24', diagonalIn: 23.8, name: 'Dell 24 Plus (S2425HSM)', brand: 'Dell', model: 'S2425HSM', asin: 'B0G49SZ24N', w: 537.64, d: 201.34, base: [242, 180], dims: { w: 537.64, d: 58.72, h: 313.73 }, standShape: 'dell', panelDepth: 58.72, panelFrontPct: 79, dimsSource: 'https://dl.dell.com/content/manual79158351-dell-24-plus-monitor-s2425hsm-outline-dimension.pdf?language=en-us', why: 'A smaller screen. The stand still needs about {201.34} of depth.', alt: 'Smaller screen' , stockCheckedAt: '2026-10-17' },
      { id: 'mon34', diagonalIn: 34, name: 'Dell 34 Plus USB-C curved (S3425DW)', brand: 'Dell', model: 'S3425DW', asin: 'B0F1H325FN', w: 807, d: 222, base: [259, 201.5], dims: { w: 807.32, d: 221.85, h: 411.53 }, standShape: 'dell', panelDepth: 116.89, panelFrontPct: 92, curveRadius: 3800, dimsSource: 'https://dl.dell.com/content/manual6669801-dell-34-plus-usb-c-monitor-s3425dw-outline-dimension.pdf?language=en-us', why: 'Two windows side by side. It needs a long desk.', alt: 'Wider, needs a long desk' , stockCheckedAt: '2026-10-17' },
      { id: 'xg27acs', diagonalIn: 27, name: 'ASUS ROG Strix 27" QHD (XG27ACS)', brand: 'ASUS', model: 'XG27ACS', asin: 'B0CV24GQ9W', w: 614.81, d: 218.82, base: [266.49, 218.82], dims: { w: 614.81, d: 60.12, h: 367.08 }, standShape: 'rog', panelDepth: 60.12, panelFrontPct: 82, dimsSource: 'https://dlcdnets.asus.com/pub/ASUS/LCD%20Monitors/XG27ACS/ASUS_XG27ACS_English.pdf?model=XG27ACS', why: 'A QHD IPS screen at 180 Hz. Its base is hexagonal.', alt: 'QHD · 180 Hz', stockCheckedAt: '2026-10-17' },
      {"id": "msig27c4x", "name": "MSI G27C4X", "brand": "MSI", "model": "G27C4X", "diagonalIn": 27, "asin": "B0BX1X4382", "w": 611.5, "d": 225.4, "base": [452.8, 225.4], "dims": {"w": 611.5, "d": 225.4, "h": 457.9}, standShape: 'tripod', panelDepth: 75.9, panelFrontPct: 70, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/G27C4X.pdf", "maxRefreshHz": 250, "alt": "1080p · 250 Hz", "why": "1080p · 250 Hz."},
      {"id": "msig32c4x", "name": "MSI G32C4X", "brand": "MSI", "model": "G32C4X", "diagonalIn": 31.5, "asin": "B0CJK6P8R4", "w": 709.4, "d": 248.7, "base": [452.8, 248.7], "dims": {"w": 709.4, "d": 248.7, "h": 509.4}, standShape: 'tripod', panelDepth: 92, panelFrontPct: 72, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/G32C4X.pdf", "maxRefreshHz": 250, "alt": "1080p · 250 Hz", "why": "1080p · 250 Hz."},
      {"id": "msig32c4xs", "name": "MSI G32C4XS", "brand": "MSI", "model": "G32C4XS", "diagonalIn": 31.5, "w": 709.4, "d": 248.7, "base": [452.8, 248.7], "dims": {"w": 709.4, "d": 248.7, "h": 509.4}, standShape: 'tripod', panelDepth: 92, panelFrontPct: 72, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/G32C4XS.pdf", "maxRefreshHz": 250, "alt": "1080p · 250 Hz", "why": "1080p · 250 Hz."},
      {"id": "msimag255pxf", "name": "MSI MAG 255PXF", "brand": "MSI", "model": "MAG 255PXF", "diagonalIn": 24.5, "w": 557.1, "d": 227.9, "base": [308.5, 227.9], "dims": {"w": 557.1, "d": 227.9, "h": 511.9}, standShape: 'shield', panelDepth: 66.4, panelFrontPct: 88, "dimsSource": "https://storage-asset.msi.com/specSheet/in/monitor/MAG%20255PXF.pdf", "maxRefreshHz": 300, "alt": "1080p · 300 Hz", "why": "1080p · 300 Hz."},
      {"id": "msimag255xf", "name": "MSI MAG 255XF", "brand": "MSI", "model": "MAG 255XF", "diagonalIn": 24.5, "asin": "B0DY14C946", "w": 557.1, "d": 220.1, "base": [318.0, 220.1], "dims": {"w": 557.1, "d": 220.1, "h": 418.5}, standShape: 'fork', panelDepth: 66.4, panelFrontPct: 62, "dimsSource": "https://storage-asset.msi.com/specSheet/es/monitor/MAG%20255XF.pdf", "maxRefreshHz": 300, "alt": "1080p · 300 Hz", "why": "1080p · 300 Hz."},
      {"id": "msimag255xfv", "name": "MSI MAG 255XFV", "brand": "MSI", "model": "MAG 255XFV", "diagonalIn": 24.5, "asin": "B0D67TTKPN", "w": 557.1, "d": 220.1, "base": [318.0, 220.1], "dims": {"w": 557.1, "d": 220.1, "h": 418.5}, standShape: 'fork', panelDepth: 66.4, panelFrontPct: 65, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20255XFV.pdf", "maxRefreshHz": 250, "alt": "1080p · 250 Hz", "why": "1080p · 250 Hz."},
      {"id": "msimag271qpqdoledx28", "name": "MSI MAG 271QP QD-OLED X28", "brand": "MSI", "model": "MAG 271QP QD-OLED X28", "diagonalIn": 26.5, "asin": "B0FKVTBBL4", "w": 609.0, "d": 242.0, "base": [309.0, 242.0], "dims": {"w": 609.0, "d": 242.0, "h": 416.0}, standShape: 'shield', panelDepth: 72, panelFrontPct: 78, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20271QP%20QD-OLED%20X28.pdf", "maxRefreshHz": 280, "alt": "1440p · 280 Hz", "why": "1440p · 280 Hz."},
      {"id": "msimag271qpxqdoled", "name": "MSI MAG 271QPX QD-OLED", "brand": "MSI", "model": "MAG 271QPX QD-OLED", "diagonalIn": 26.5, "asin": "B0CWPXVQJN", "w": 609.0, "d": 242.0, "base": [309.0, 242.0], "dims": {"w": 609.0, "d": 242.0, "h": 416.0}, standShape: 'shield', panelDepth: 72, panelFrontPct: 78, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20271QPX%20QD-OLED.pdf", "maxRefreshHz": 360, "alt": "1440p · 360 Hz", "why": "1440p · 360 Hz."},
      {"id": "msimag272qpqdoledx50", "name": "MSI MAG 272QP QD-OLED X50", "brand": "MSI", "model": "MAG 272QP QD-OLED X50", "diagonalIn": 26.5, "asin": "B0FKVWSLS6", "w": 610.31, "d": 241.9, "base": [308.67, 241.9], "dims": {"w": 610.31, "d": 241.9, "h": 532.03}, standShape: 'shield', panelDepth: 69.15, panelFrontPct: 82, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20272QP%20QD-OLED%20X50.pdf", "maxRefreshHz": 500, "alt": "1440p · 500 Hz", "why": "1440p · 500 Hz."},
      {"id": "msimag272qpwqdoledx28", "name": "MSI MAG 272QPW QD-OLED X28", "brand": "MSI", "model": "MAG 272QPW QD-OLED X28", "diagonalIn": 26.5, "asin": "B0FKV4GHBL", "w": 611.1, "d": 241.9, "base": [308.67, 241.9], "dims": {"w": 611.1, "d": 241.9, "h": 532.84}, standShape: 'shield', panelDepth: 69.3, panelFrontPct: 82, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20272QPW%20QD-OLED%20X28.pdf", "maxRefreshHz": 280, "alt": "1440p · 280 Hz", "why": "1440p · 280 Hz."},
      {"id": "msimag272urdfe16", "name": "MSI MAG 272URDF E16", "brand": "MSI", "model": "MAG 272URDF E16", "diagonalIn": 27, "asin": "B0FG5ZTC6P", "w": 613.5, "d": 227.9, "base": [308.52, 227.9], "dims": {"w": 613.5, "d": 227.9, "h": 536.3}, standShape: 'bevel', panelDepth: 54.6, panelFrontPct: 83, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20272URDF%20E16.pdf", "maxRefreshHz": 320, "alt": "4K 160 Hz / 1080p 320 Hz", "why": "4K 160 Hz / 1080p 320 Hz."},
      {"id": "msimag274cqpdfx32", "name": "MSI MAG 274CQPDF X32", "brand": "MSI", "model": "MAG 274CQPDF X32", "diagonalIn": 27, "asin": "B0HC1R13S1", "w": 613.5, "d": 278.3, "base": [549.9, 278.3], "dims": {"w": 613.5, "d": 278.3, "h": 403.7}, standShape: 'tripod', panelDepth: 78.3, panelFrontPct: 74, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20274CQPDF%20X32.pdf", "maxRefreshHz": 400, "alt": "1440p 320 Hz / 720p 400 Hz", "why": "1440p 320 Hz / 720p 400 Hz."},
      {"id": "msimag274cxf", "name": "MSI MAG 274CXF", "brand": "MSI", "model": "MAG 274CXF", "diagonalIn": 27, "asin": "B0DJRWNB4B", "w": 614.0, "d": 250.0, "base": [340.0, 250.0], "dims": {"w": 614.0, "d": 250.0, "h": 438.0}, standShape: 'fork', panelDepth: 77, panelFrontPct: 75, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20274CXF.pdf", "maxRefreshHz": 280, "alt": "1080p · 280 Hz", "why": "1080p · 280 Hz."},
      {"id": "msimag274qpfx30mv", "name": "MSI MAG 274QPF X30MV", "brand": "MSI", "model": "MAG 274QPF X30MV", "diagonalIn": 27, "asin": "B0FP45L1BH", "w": 613.1, "d": 227.9, "base": [312.53, 202.38], "dims": {"w": 613.1, "d": 227.9, "h": 423.53}, standShape: 'bevel', panelDepth: 68.77, panelFrontPct: 88, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20274QPF%20X30MV.pdf", "maxRefreshHz": 300, "alt": "1440p · 300 Hz", "why": "1440p · 300 Hz."},
      {"id": "msimag274qpfx32", "name": "MSI MAG 274QPF X32", "brand": "MSI", "model": "MAG 274QPF X32", "diagonalIn": 27, "asin": "B0H4WX9WRP", "w": 613.5, "d": 227.9, "base": [308.6, 227.89], "dims": {"w": 613.5, "d": 227.9, "h": 405.0}, standShape: 'bevel', panelDepth: 62, panelFrontPct: 85, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20274QPF%20X32.pdf", "maxRefreshHz": 320, "alt": "1440p · 320 Hz", "why": "1440p · 320 Hz."},
      {"id": "msimag274qrfwx32", "name": "MSI MAG 274QRFW X32", "brand": "MSI", "model": "MAG 274QRFW X32", "diagonalIn": 27, "asin": "B0FKTXF5BX", "w": 613.5, "d": 227.9, "base": [308.6, 227.89], "dims": {"w": 613.5, "d": 227.9, "h": 405.0}, standShape: 'bevel', panelDepth: 62, panelFrontPct: 85, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20274QRFW%20X32.pdf", "maxRefreshHz": 320, "alt": "1440p · 320 Hz", "why": "1440p · 320 Hz."},
      {"id": "msimag274updfe16m", "name": "MSI MAG 274UPDF E16M", "brand": "MSI", "model": "MAG 274UPDF E16M", "diagonalIn": 27, "asin": "B0FTZSYQY7", "w": 613.1, "d": 227.9, "base": [312.53, 202.38], "dims": {"w": 613.1, "d": 227.9, "h": 423.53}, standShape: 'bevel', panelDepth: 68.77, panelFrontPct: 88, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20274UPDF%20E16M.pdf", "maxRefreshHz": 320, "alt": "4K 160 Hz / 1080p 320 Hz", "why": "4K 160 Hz / 1080p 320 Hz."},
      {"id": "msimag275upde14", "name": "MSI MAG 275UPD E14", "brand": "MSI", "model": "MAG 275UPD E14", "diagonalIn": 27, "asin": "B0F6VGYB2Z", "w": 613.3, "d": 227.9, "base": [308.6, 227.9], "dims": {"w": 613.3, "d": 227.9, "h": 534.2}, standShape: 'bevel', panelDepth: 57.9, panelFrontPct: 85, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20275UPD%20E14.pdf", "maxRefreshHz": 288, "alt": "4K 144 Hz / 1080p 288 Hz", "why": "4K 144 Hz / 1080p 288 Hz."},
      {"id": "msimag276cxf", "name": "MSI MAG 276CXF", "brand": "MSI", "model": "MAG 276CXF", "diagonalIn": 27, "asin": "B0DJRVB98P", "w": 610.5, "d": 249.8, "base": [339.8, 249.7], "dims": {"w": 610.5, "d": 249.8, "h": 451.6}, standShape: 'fork', panelDepth: 90.4, panelFrontPct: 80, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20276CXF.pdf", "maxRefreshHz": 280, "alt": "1080p · 280 Hz", "why": "1080p · 280 Hz."},
      {"id": "msimag27c6x", "name": "MSI MAG 27C6X", "brand": "MSI", "model": "MAG 27C6X", "diagonalIn": 27, "asin": "B0D2PQ9HNL", "w": 610.5, "d": 249.8, "base": [339.8, 249.7], "dims": {"w": 610.5, "d": 249.8, "h": 451.6}, standShape: 'fork', panelDepth: 90.4, panelFrontPct: 80, curveRadius: 1500, "dimsSource": "https://fr.msi.com/Monitor/MAG-27C6X/Specification", "maxRefreshHz": 250, "alt": "1080p · 250 Hz (OC)", "why": "1080p · 250 Hz (OC)."},
      {"id": "msimag321cupdf", "name": "MSI MAG 321CUPDF", "brand": "MSI", "model": "MAG 321CUPDF", "diagonalIn": 31.5, "asin": "B0F2QSJZJY", "w": 711.0, "d": 267.0, "base": [470.0, 267.0], "dims": {"w": 711.0, "d": 267.0, "h": 534.0}, standShape: 'tripod', panelDepth: 99, panelFrontPct: 83, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20321CUPDF.pdf", "maxRefreshHz": 320, "alt": "4K 160 Hz / 1080p 320 Hz", "why": "4K 160 Hz / 1080p 320 Hz."},
      {"id": "msimag321upde14", "name": "MSI MAG 321UPD E14", "brand": "MSI", "model": "MAG 321UPD E14", "diagonalIn": 31.5, "asin": "B0H72M95QS", "w": 713.94, "d": 261.89, "base": [308.65, 261.89], "dims": {"w": 713.94, "d": 261.89, "h": 563.85}, standShape: 'shield', panelDepth: 61.09, panelFrontPct: 82, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20321UPD%20E14.pdf", "maxRefreshHz": 288, "alt": "4K 144 Hz / 1080p 288 Hz", "why": "4K 144 Hz / 1080p 288 Hz."},
      {"id": "msimag322urdfe16", "name": "MSI MAG 322URDF E16", "brand": "MSI", "model": "MAG 322URDF E16", "diagonalIn": 31.5, "asin": "B0FPGK3C92", "w": 714.08, "d": 227.9, "base": [308.52, 227.9], "dims": {"w": 714.08, "d": 227.76, "h": 564.48}, standShape: 'bevel', panelDepth: 72.93, panelFrontPct: 78, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%20322URDF%20E16.pdf", "maxRefreshHz": 320, "alt": "4K 160 Hz / 1080p 320 Hz", "why": "4K 160 Hz / 1080p 320 Hz."},
      {"id": "msimag32c6x", "name": "MSI MAG 32C6X", "brand": "MSI", "model": "MAG 32C6X", "diagonalIn": 31.5, "asin": "B0DBW1D1DS", "w": 709.4, "d": 249.8, "base": [339.8, 249.8], "dims": {"w": 709.4, "d": 249.8, "h": 507.2}, standShape: 'fork', panelDepth: 107.2, panelFrontPct: 74, curveRadius: 1500, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MAG%2032C6X.pdf", "maxRefreshHz": 250, "alt": "1080p · 250 Hz", "why": "1080p · 250 Hz."},
      {"id": "msimag341cqpqdoledx28", "name": "MSI MAG 341CQP QD-OLED X28", "brand": "MSI", "model": "MAG 341CQP QD-OLED X28", "diagonalIn": 34.18, "asin": "B0GVZKCD2F", "w": 811.7, "d": 229.9, "base": [275.5, 229.9], "dims": {"w": 811.7, "d": 229.9, "h": 430.4}, standShape: 'compact', panelDepth: 131.3, panelFrontPct: 99, curveRadius: 1800, "dimsSource": "https://storage-asset.msi.com/specSheet/uk/monitor/MAG%20341CQP%20QD-OLED%20X28.pdf", "maxRefreshHz": 280, "alt": "Ultrawide 1440p · 280 Hz", "why": "Ultrawide 1440p · 280 Hz."},
      {"id": "msimegx", "name": "MSI MEG X", "brand": "MSI", "model": "MEG X", "diagonalIn": 34.18, "w": 811.7, "d": 237.4, "base": [330.7, 237.4], "dims": {"w": 811.7, "d": 237.4, "h": 548.0}, standShape: 'rectangle', panelDepth: 118.1, panelFrontPct: 96, curveRadius: 1800, "dimsSource": "https://storage-asset.msi.com/specSheet/de/monitor/MEG%20X.pdf", "maxRefreshHz": 360, "alt": "Ultrawide 1440p · 360 Hz", "why": "Ultrawide 1440p · 360 Hz."},
      {"id": "msimpg271qrqdoledx50", "name": "MSI MPG 271QR QD-OLED X50", "brand": "MSI", "model": "MPG 271QR QD-OLED X50", "diagonalIn": 26.5, "asin": "B0G4P3ZNKN", "w": 609.3, "d": 241.9, "base": [308.7, 241.9], "dims": {"w": 609.3, "d": 241.9, "h": 416.1}, standShape: 'shield', panelDepth: 72.3, panelFrontPct: 79, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MPG%20271QR%20QD-OLED%20X50.pdf", "maxRefreshHz": 500, "alt": "1440p · 500 Hz", "why": "1440p · 500 Hz."},
      {"id": "msimpg271qrxqdoled", "name": "MSI MPG 271QRX QD-OLED", "brand": "MSI", "model": "MPG 271QRX QD-OLED", "diagonalIn": 26.5, "asin": "B0CTS1RQ6Y", "w": 610.0, "d": 242.0, "base": [309.0, 242.0], "dims": {"w": 610.0, "d": 242.0, "h": 422.0}, standShape: 'shield', panelDepth: 69, panelFrontPct: 78, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MPG%20271QRX%20QD-OLED.pdf", "maxRefreshHz": 360, "alt": "1440p · 360 Hz", "why": "1440p · 360 Hz."},
      {"id": "msimpg272qrfx36", "name": "MSI MPG 272QRF X36", "brand": "MSI", "model": "MPG 272QRF X36", "diagonalIn": 27, "asin": "B0GHQWM3QD", "w": 614.3, "d": 227.9, "base": [308.6, 227.9], "dims": {"w": 614.3, "d": 227.9, "h": 422.2}, standShape: 'shield', panelDepth: 75.1, panelFrontPct: 88, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MPG%20272QRF%20X36.pdf", "maxRefreshHz": 360, "alt": "1440p · 360 Hz", "why": "1440p · 360 Hz."},
      {"id": "msimpg274urdfwe16m", "name": "MSI MPG 274URDFW E16M", "brand": "MSI", "model": "MPG 274URDFW E16M", "diagonalIn": 27, "asin": "B0FVPX9LFN", "w": 613.1, "d": 202.38, "base": [312.53, 202.38], "dims": {"w": 613.1, "d": 202.38, "h": 400.85}, standShape: 'bevel', panelDepth: 68.77, panelFrontPct: 98, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MPG%20274URDFW%20E16M.pdf", "maxRefreshHz": 320, "alt": "4K 160 Hz / 1080p 320 Hz", "why": "4K 160 Hz / 1080p 320 Hz."},
      {"id": "msimpg341cqrqdoledx36", "name": "MSI MPG 341CQR QD-OLED X36", "brand": "MSI", "model": "MPG 341CQR QD-OLED X36", "diagonalIn": 34, "asin": "B0GL9NWNTQ", "w": 812.83, "d": 228.3, "base": [235.48, 228.3], "dims": {"w": 812.83, "d": 228.3, "h": 543.08}, standShape: 'insetPlate', panelDepth: 118.54, panelFrontPct: 100, curveRadius: 1800, "dimsSource": "https://storage-asset.msi.com/specSheet/us/monitor/MPG%20341CQR%20QD-OLED%20X36.pdf", "maxRefreshHz": 360, "alt": "Ultrawide 1440p · 360 Hz", "why": "Ultrawide 1440p · 360 Hz."}
    ],
    keyboard: [
      { id: 'tkl', name: 'Logitech G PRO X TKL LIGHTSPEED', brand: 'Logitech G', model: 'PRO X TKL LIGHTSPEED', asin: 'B0BQBSH6NQ', w: 352, d: 150, dims: { w: 352, d: 150, h: 34 }, dimsSource: 'https://www.logitechg.com/en-ca/products/gaming-keyboards/pro-x-tkl-wireless-keyboard.html', why: 'No number pad, so the mouse gets more room.', alt: 'All-round pick' , stockCheckedAt: '2026-10-17' },
      { id: 'k75', name: 'Logitech MX Mechanical Mini', brand: 'Logitech', model: '920-010550 (Tactile Quiet, Graphite)', asin: 'B09LK73VHG', w: 313, d: 132, dims: { w: 312.6, d: 131.55, h: 26.1 }, dimsSource: 'https://media.distrelec.com/Web/Downloads/_t/ds/MX-Mechanical-Wireless_eng_tds.pdf', why: 'Even more compact, and it keeps the arrow keys.', alt: 'Smaller, more mouse room' , stockCheckedAt: '2026-10-17' },
      { id: 'full', name: 'Logitech MX Keys S', brand: 'Logitech', model: 'MX Keys S (Graphite)', asin: 'B0BKW3LB2B', w: 430, d: 132, dims: { w: 430.2, d: 131.63, h: 20.5 }, dimsSource: 'https://support.logi.com/hc/en-us/articles/13750828873623-Specification-MX-Keys-S', why: 'Has a number pad, and takes about {80} more width for it.', alt: 'Number pad, about {80} wider' , stockCheckedAt: '2026-10-17' },
      { id: 'gsv60', name: 'SteelSeries Apex Pro Mini', brand: 'SteelSeries', model: 'Apex Pro Mini (wired)', asin: 'B0B16HXVVQ', w: 293, d: 103, dims: { w: 293, d: 103, h: 40.3 }, dimsSource: 'https://steelseries.com/gaming-keyboards/apex-pro-mini', why: 'A wired 60% board. The smallest keyboard here, so the mouse gets the most room.', alt: '60%, wired' , stockCheckedAt: '2026-10-17' },
      { id: 'hv3m', name: 'Razer Huntsman V3 Pro Mini', brand: 'Razer', model: 'RZ03-04990200-R3U1', asin: 'B0CG7C1NVP', w: 298, d: 114, dims: { w: 298, d: 114, h: 38 }, dimsSource: 'https://mysupport.razer.com/app/answers/detail/a_id/13592', why: 'A 60% board with analog switches. Shorter than a tenkeyless, so the mouse gets more room.', alt: '60%, analog switches' , stockCheckedAt: '2026-10-17' },
      { id: 'g515', name: 'Logitech G515 LIGHTSPEED TKL', brand: 'Logitech G', model: 'G515 LIGHTSPEED TKL (Tactile, Black)', asin: 'B0D1DSW8TF', w: 354.75, d: 146, dims: { w: 354.75, d: 146, h: 22.14 }, dimsSource: 'https://support.logi.com/hc/en-us/articles/23600704280087-Specification-G515-LIGHTSPEED-TKL', why: 'A low-profile tenkeyless, {22.14} tall, with no number pad.', alt: 'Low profile, no number pad', stockCheckedAt: '2026-10-17' },
      { id: 'bwv475', name: 'Razer BlackWidow V4 75%', brand: 'Razer', model: 'RZ03-05000200-R3U1 (Black)', asin: 'B0CCFY349S', w: 321, d: 155.5, dims: { w: 321, d: 155.5, h: 24 }, dimsSource: 'https://mysupport.razer.com/app/answers/detail/a_id/13257', why: 'A 75% board that keeps the function row and arrows. The wrist rest adds {85} of depth.', alt: '75%, arrows and F-row', stockCheckedAt: '2026-10-17' },
      { id: 'k65pw', name: 'Corsair K65 PLUS WIRELESS', brand: 'Corsair', model: 'CH-91D401L-NA (Black/Gray)', asin: 'B0CQ31VFT4', w: 320, d: 136, dims: { w: 320, d: 136, h: 35 }, dimsSource: 'https://www.corsair.com/ww/en/explorer/gamer/keyboards/corsair-k65-plus-wireless-everything-you-need-to-know/', why: 'A wireless 75% board with arrows and a function row.', alt: '75%, wireless', stockCheckedAt: '2026-10-17' },
      { id: 'azoth', name: 'ASUS ROG Azoth', brand: 'ASUS', model: 'ROG Azoth (NX Snow, Black)', asin: 'B0CP6J59XB', w: 326, d: 136, dims: { w: 326, d: 136, h: 40 }, dimsSource: 'https://rog.asus.com/us/keyboards/keyboards/compact/rog-azoth-model/spec/', why: 'A 75% board with an OLED screen and knob. {40} tall, so a wrist rest helps.', alt: '75%, wireless', stockCheckedAt: '2026-10-17' },
      { id: 'k2max', name: 'Keychron K2 Max', brand: 'Keychron', model: 'K2 Max (RGB, Banana switch)', asin: 'B0DFGLWBK1', w: 311.54, d: 121.54, dims: { w: 311.54, d: 121.54, h: 41.54 }, dimsSource: 'https://www.keychron.com/products/keychron-k2-max-qmk-wireless-mechanical-keyboard', why: 'A wireless 75% board, so it leaves room on a shallow desk.', alt: '75%, compact', stockCheckedAt: '2026-10-17' },
      { id: 'flow84', name: 'Lofree Flow84', brand: 'Lofree', model: 'Flow84 (White, Ghost linear)', asin: 'B0CJTV8P4Z', w: 316, d: 126, dims: { w: 316, d: 126, h: 24.5 }, dimsSource: 'https://www.lofree.co/products/lofree-flow-the-smoothest-mechanical-keyboard', why: 'A low-profile 75% board, {24.5} tall, with a function row.', alt: 'Low profile, 75%', stockCheckedAt: '2026-10-17' },
      { id: 'mkusbc', name: 'Apple Magic Keyboard (USB-C)', brand: 'Apple', model: 'Magic Keyboard (USB-C), US English', asin: 'B0HGGHSWK7', w: 278.9, d: 114.9, dims: { w: 278.9, d: 114.9, h: 10.9 }, dimsSource: 'https://support.apple.com/en-au/121955', why: 'A slim Apple board, {10.9} tall. No number pad.', alt: 'Mac, low profile', stockCheckedAt: '2026-10-17' },
      { id: 'mknum', name: 'Apple Magic Keyboard with Numeric Keypad', brand: 'Apple', model: 'MXCJ3LL/A, US English (White)', asin: 'B0DWTT6Z7H', w: 418.7, d: 114.9, dims: { w: 418.7, d: 114.9, h: 10.9 }, dimsSource: 'https://www.apple.com/shop/product/mxcj3ll/a/magic-keyboard-with-numeric-keypad-us-english', why: 'A full-size Apple board with a number pad, only {10.9} tall.', alt: 'Mac, full size', stockCheckedAt: '2026-10-17' },
      { id: 'mktid', name: 'Apple Magic Keyboard with Touch ID (USB-C)', brand: 'Apple', model: 'Magic Keyboard with Touch ID (USB-C), US English', asin: 'B0HGG4574D', w: 278.9, d: 114.9, dims: { w: 278.9, d: 114.9, h: 10.9 }, dimsSource: 'https://support.apple.com/en-au/121954', why: 'The compact Magic Keyboard with a Touch ID key for Apple silicon Macs.', alt: 'Mac, Touch ID', stockCheckedAt: '2026-10-17' },
      { id: 'mktidnumw', name: 'Apple Magic Keyboard with Touch ID and Numeric Keypad (White keys)', brand: 'Apple', model: 'Magic Keyboard with Touch ID and Numeric Keypad (USB-C), US English, White keys', asin: 'B0HGGCB78N', w: 418.7, d: 114.9, dims: { w: 418.7, d: 114.9, h: 10.9 }, dimsSource: 'https://support.apple.com/en-md/121953', why: 'Full-size with Touch ID and a number pad, {10.9} tall.', alt: 'Mac, full size, Touch ID', stockCheckedAt: '2026-10-17' },
      { id: 'gsv75', name: 'GravaStar Mercury V75', brand: 'GravaStar', model: 'Mercury V75 (Silver Frost)', asin: 'B0HFMM1WMV', w: 343, d: 156, dims: { w: 343, d: 156, h: 46 }, dimsSource: 'https://www.gravastar.com/products/mercury-v75-silver-frost', why: 'A Hall-effect 75% board. {46} tall, so a wrist rest helps.', alt: '75%, Hall effect', stockCheckedAt: '2026-10-17' },
      { id: 'kb65he', name: 'Endgame Gear KB65HE', brand: 'Endgame Gear', model: 'KB65HE, Gateron KS-37B, ANSI US', asin: 'B0CSDSDQJP', w: 315, d: 108.8, dims: { w: 315, d: 108.8, h: 37.2 }, dimsSource: 'https://endgamegear.com/products/kb65he-hall-effect-gaming-keyboard-ansi-us', why: 'A 65% Hall-effect board.', alt: '65%, Hall effect', stockCheckedAt: '2026-10-17' },
      { id: 'kb65he8k', name: 'Endgame Gear KB65HE 8k', brand: 'Endgame Gear', model: 'KB65HE 8k, Raesha silent magnetic switches, ANSI US', asin: 'B0F47MJ1GM', w: 315, d: 108.8, dims: { w: 315, d: 108.8, h: 37.2 }, dimsSource: 'https://endgamegear.com/products/kb65he-8k-hall-effect-gaming-keyboard-ansi-us', why: 'The 8000 Hz version of the KB65HE.', alt: '65%, Hall effect', stockCheckedAt: '2026-10-17' },
      { id: 'epf75', name: 'EPOMAKER x AULA F75', brand: 'EPOMAKER', model: 'F75 (Black, Ice Vein switch)', asin: 'B0CW9CT5TV', w: 322.7, d: 143.2, dims: { w: 322.7, d: 143.2, h: 43.1 }, dimsSource: 'https://epomaker.com/products/epomaker-aula-f75', why: 'A budget 75% gasket board with a knob. {43.1} tall, so a wrist rest helps.', alt: '75%, budget', stockCheckedAt: '2026-10-17' },
      { id: 'g75pro', name: 'MCHOSE G75 PRO', brand: 'MCHOSE', model: 'G75 PRO (White & Green, linear)', asin: 'B0F1F5HSP6', w: 321.62, d: 139.48, dims: { w: 321.62, d: 139.48, h: 42.14 }, dimsSource: 'https://www.mchose.store/products/mchose-g75-tri-mode-gaming-gasket-structure-customized-mechanical-keyboard', why: 'A budget wireless 75% gasket board. {42.14} tall, so a wrist rest helps.', alt: '75%, budget', stockCheckedAt: '2026-10-17' },
      { id: 'gsv75lite', name: 'GravaStar Mercury V75 Lite', brand: 'GravaStar', model: 'Mercury V75 Lite', asin: 'B0FD3V3RPY', w: 343, d: 156, dims: { w: 343, d: 156, h: 46 }, dimsSource: 'https://www.gravastar.com/products/mercury-v75-lite-onyx-crystal', why: 'A compact keyboard with a function row.', alt: '75%, Hall effect, budget', stockCheckedAt: '2026-10-17' },
      { id: 'asx85', name: 'ATTACK SHARK X85', brand: 'ATTACK SHARK', model: 'X85 (Moonlit, White Jade linear)', asin: 'B0CZJLZKDZ', w: 355, d: 185, dims: { w: 355, d: 185, h: 50 }, dimsSource: 'https://attackshark.com/products/attack-shark-x85', why: 'A budget 75% board. {50} tall, so a wrist rest helps.', alt: '75%, budget', stockCheckedAt: '2026-10-17' }
    ],
    pad: [
      { id: 'cloth', name: 'SteelSeries QcK Heavy Large', brand: 'SteelSeries', model: 'QcK Heavy Large', kind: 'cloth', asin: 'B000V7ARAU', w: 450, d: 400, dims: { w: 450, d: 400, h: 6 }, dimsSource: 'https://steelseries.com/gaming-mousepads/qck-heavy?color=black&mousepadSize=large', why: 'Big enough for a low-sensitivity arm swing. Keep the keyboard off it so the mouse keeps its room.', alt: 'Cloth, for the mouse only' , stockCheckedAt: '2026-10-17' },
      { id: 'clothm', name: 'Razer Gigantus V2 Medium', brand: 'Razer', model: 'Gigantus V2 Medium', kind: 'cloth', asin: 'B088539GLT', w: 360, d: 275, dims: { w: 360, d: 275, h: 3 }, dimsSource: 'https://mysupport.razer.com/app/answers/detail/a_id/3739', why: 'Small enough for a compact desk, with room for wrist and arm aiming.', alt: 'Cloth, for small desks', stockCheckedAt: '2026-10-17' },
      { id: 'qckm', name: 'SteelSeries QcK Medium', brand: 'SteelSeries', model: 'QcK Medium 63004 (Black)', kind: 'cloth', asin: 'B000UEZ36W', w: 320, d: 270, dims: { w: 320, d: 270, h: 2 }, dimsSource: 'https://steelseries.com/gaming-mousepads/qck', why: 'The classic {320} x {270} cloth pad, for the tightest desks.', alt: 'Cloth, medium', stockCheckedAt: '2026-10-17' },
      { id: 'mat', name: 'SteelSeries QcK XXL', brand: 'SteelSeries', model: 'QcK XXL', kind: 'mat', asin: 'B0CVN5MQ6P', w: 900, d: 400, dims: { w: 900, d: 400, h: 2 }, dimsSource: 'https://steelseries.com/en-ie/gaming-mousepads/qck', why: 'Long enough for the keyboard and the mouse to share it.', alt: 'Cloth, keyboard goes on it too' , stockCheckedAt: '2026-10-17' },
      { id: 'glass', name: 'Razer Atlas', brand: 'Razer', model: 'RZ02-04890100-R3U1', kind: 'glass', asin: 'B0BWLZ65D7', w: 450, d: 400, dims: { w: 450, d: 400, h: 5 }, dimsSource: 'https://mysupport.razer.com/app/answers/detail/a_id/9755', why: 'Fast and smooth. It is hard glass, so nothing but the mouse goes on it.', alt: 'Faster glide, mouse only' , stockCheckedAt: '2026-10-17' },
      { id: 'g640', name: 'Logitech G640 Large', brand: 'Logitech G', model: '943-000088 (Black)', kind: 'cloth', asin: 'B0BHMKVF1P', w: 460, d: 400, dims: { w: 460, d: 400, h: 3 }, dimsSource: 'https://www.logitechg.com/en-us/shop/p/g640-cloth-gaming-mouse-pad', why: 'A large cloth pad for arm aiming.', alt: 'Cloth, for the mouse only', stockCheckedAt: '2026-10-17' },
      { id: 'g840', name: 'Logitech G840 XL', brand: 'Logitech G', model: '943-000776 (Black)', kind: 'mat', asin: 'B0BHMN52LY', w: 900, d: 400, dims: { w: 900, d: 400, h: 3 }, dimsSource: 'https://support.logi.com/hc/en-us/articles/360023463393-G840-XL-Gaming-Mouse-Pad-Technical-Specifications', why: 'The keyboard and the mouse share it.', alt: 'Cloth desk mat', stockCheckedAt: '2026-10-17' },
      { id: 'gigv2xxl', name: 'Razer Gigantus V2 XXL', brand: 'Razer', model: 'Gigantus V2 XXL (Black)', kind: 'mat', asin: 'B0885FJ8CB', w: 940, d: 410, dims: { w: 940, d: 410, h: 4 }, dimsSource: 'https://www.razer.com/gaming-mouse-mats/razer-gigantus-v2', why: 'Cloth with room for the keyboard and a wide mouse swing.', alt: 'Cloth desk mat', stockCheckedAt: '2026-10-17' },
      { id: 'mm350xl', name: 'Corsair MM350 PRO Extended XL', brand: 'Corsair', model: 'CH-9413770-WW (Black/Gray)', kind: 'mat', asin: 'B08JH89XLF', w: 930, d: 400, dims: { w: 930, d: 400, h: 4 }, dimsSource: 'https://www.corsair.com/us/en/p/mousepads/ch-9413770-ww/mm350-pro-premium-spill-proof-cloth-gaming-mouse-pad-extended-xl-black-ch-9413770-ww', why: 'Spill-proof cloth. The keyboard and mouse both fit.', alt: 'Cloth desk mat', stockCheckedAt: '2026-10-17' },
      { id: 'honeacexxl', name: 'ASUS ROG Hone Ace XXL', brand: 'ASUS', model: '90MP03G0-BPUA00', kind: 'mat', asin: 'B0CQPG6QC8', w: 900, d: 400, dims: { w: 900, d: 400, h: 3 }, dimsSource: 'https://rog.asus.com/us/mice-mouse-pads/mouse-pads/rog-hone-ace-xxl/spec/', why: 'Enough for the keyboard and mouse together.', alt: 'Cloth desk mat', stockCheckedAt: '2026-10-17' },
      { id: 'sp004a', name: 'Wallhack SP-004A', brand: 'Wallhack', model: 'SP-004A (Black)', kind: 'glass', asin: 'B0FKTHF6D8', w: 450, d: 390, dims: { w: 450, d: 390, h: 3.9 }, dimsSource: 'https://wallhack.com/en-eu/products/sp-004a-black-bundle-with-ptfe-silent-skates-pro-sleeve', why: 'A compact glass pad. Fast glide, and nothing but the mouse goes on it.', alt: 'Glass, compact', stockCheckedAt: '2026-10-17' },
      { id: 'hienxl', name: 'Artisan Ninja FX Hien Soft XL', brand: 'Artisan', model: 'FX-HI-SF-XL-B (Black)', kind: 'cloth', asin: 'B07F61BYQP', w: 490, d: 420, dims: { w: 490, d: 420, h: 4 }, dimsSource: 'https://artisan-jp.com/global/fx-hien', why: 'A cloth pad with a textured surface for more controlled movements.', alt: 'Control, XL', stockCheckedAt: '2026-10-17' },
      { id: 'zgsriii', name: 'ZOWIE G-SR III', brand: 'BenQ ZOWIE', model: 'G-SR III', kind: 'cloth', asin: 'B0DMTQ9922', w: 470, d: 390, dims: { w: 470, d: 390, h: 3.5 }, dimsSource: 'https://zowie.benq.com/en-us/mouse-pad/g-sr-iii.html', why: 'A cloth pad for the mouse only.', alt: 'Cloth, large', stockCheckedAt: '2026-10-17' },
      { id: 'zgsrsebi', name: 'ZOWIE G-SR-SE Bi', brand: 'BenQ ZOWIE', model: 'G-SR-SE Bi', kind: 'cloth', asin: 'B0D6V8623C', w: 470, d: 390, dims: { w: 470, d: 390, h: 3.5 }, dimsSource: 'https://zowie.benq.com/en-us/mouse-pad/g-sr-se-bi.html', why: 'A cloth pad for the mouse only.', alt: 'Cloth, large', stockCheckedAt: '2026-10-17' },
      { id: 'zgsrseorange', name: 'ZOWIE G-SR-SE Orange', brand: 'BenQ ZOWIE', model: 'G-SR-SE Orange', kind: 'cloth', asin: 'B0GY1NK31L', w: 470, d: 390, dims: { w: 470, d: 390, h: 3.5 }, dimsSource: 'https://zowie.benq.com/en-us/mouse-pad/g-sr-se-orange.html', why: 'A cloth pad for the mouse only.', alt: 'Cloth, large', stockCheckedAt: '2026-10-17' },
      { id: 'zhsriii', name: 'ZOWIE H-SR III', brand: 'BenQ ZOWIE', model: 'H-SR III', kind: 'cloth', asin: 'B0DMTQ39T5', w: 500, d: 500, dims: { w: 500, d: 500, h: 3.5 }, dimsSource: 'https://zowie.benq.com/en-us/mouse-pad/h-sr-iii.html', why: 'A cloth pad for the mouse only. Square, for low-sensitivity players.', alt: 'Cloth, XL square', stockCheckedAt: '2026-10-17' },
      { id: 'zhsrseorange', name: 'ZOWIE H-SR-SE Orange', brand: 'BenQ ZOWIE', model: 'H-SR-SE Orange', kind: 'cloth', asin: 'B0GY1F9SYM', w: 500, d: 500, dims: { w: 500, d: 500, h: 3.5 }, dimsSource: 'https://zowie.benq.com/en-us/mouse-pad/h-sr-se-orange.html', why: 'A cloth pad for the mouse only. Square, for low-sensitivity players.', alt: 'Cloth, XL square', stockCheckedAt: '2026-10-17' },
      { id: 'zhsrserougeii', name: 'ZOWIE H-SR-SE Rouge II', brand: 'BenQ ZOWIE', model: 'H-SR-SE Rouge II', kind: 'cloth', asin: 'B0DMTPRFX8', w: 500, d: 500, dims: { w: 500, d: 500, h: 3.5 }, dimsSource: 'https://zowie.benq.com/en-us/mouse-pad/h-sr-se-rouge-ii.html', why: 'A cloth pad for the mouse only. Square, for low-sensitivity players.', alt: 'Cloth, XL square', stockCheckedAt: '2026-10-17' },
      { id: 'zhtr', name: 'ZOWIE H-TR', brand: 'BenQ ZOWIE', model: 'H-TR', kind: 'cloth', asin: 'B0DWHP6TSJ', w: 500, d: 500, dims: { w: 500, d: 500, h: 3.5 }, dimsSource: 'https://zowie.benq.com/en-ap/mouse-pad/h-tr.html', why: 'A cloth pad for the mouse only. Square, for low-sensitivity players.', alt: 'Cloth, XL square', stockCheckedAt: '2026-10-17' },
      { id: 'emb', name: 'Endgame Gear EM-B', brand: 'Endgame Gear', model: 'EM-B (490 x 410 mm)', kind: 'cloth', asin: 'B0CZTXC4B5', w: 490, d: 410, dims: { w: 490, d: 410, h: 3 }, dimsSource: 'https://endgamegear.com/products/em-b-gaming-mousepad', why: 'A cloth pad, {3} thick.', alt: 'Cloth, large', stockCheckedAt: '2026-10-17' },
      { id: 'emc', name: 'Endgame Gear EM-C', brand: 'Endgame Gear', model: 'EM-C (490 x 410 mm, Black)', kind: 'cloth', asin: 'B0C59C7GSJ', w: 490, d: 410, dims: { w: 490, d: 410, h: 3 }, dimsSource: 'https://endgamegear.com/products/em-c-gaming-mousepad-1', why: 'A cloth pad, {3} thick.', alt: 'Cloth, large', stockCheckedAt: '2026-10-17' }
    ],
    mouse: [
      { id: 'da3', name: 'Razer DeathAdder V3', brand: 'Razer', model: 'RZ01-04640100-R3U1', asin: 'B0B6XTDJS1', w: 68, d: 128, g: 59, grips: ['palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 68, d: 128, h: 44 }, dimsSource: 'https://mysupport.razer.com/app/answers/detail/a_id/6124', why: 'Long body with a raised back for palm grips. Weighs 59 g.', alt: 'Long, for palm grips' , stockCheckedAt: '2026-10-17' },
      { id: 'ec2c', name: 'Razer DeathAdder V3 HyperSpeed', brand: 'Razer', model: 'RZ01-05140', asin: 'B0D4RF55QK', w: 64.8, d: 122.2, g: 55, grips: ['palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 64.8, d: 122.2, h: 41.3 }, dimsSource: 'https://mysupport.razer.com/app/answers/detail/a_id/14235', why: 'Right-handed, with a rear hump for a palm grip. At 55 g it is lighter than the wired DeathAdder.', alt: 'Ergo, for palm grips' , stockCheckedAt: '2026-10-17' },
      { id: 'vv2p', name: 'Razer Viper V2 Pro', brand: 'Razer', model: 'RZ01-04390100-R3U1', asin: 'B09VCR969M', w: 66.2, d: 126.5, g: 58, grips: ['claw', 'fingertip'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 66.2, d: 126.5, h: 37.8 }, dimsSource: 'https://www.razer.com/gaming-mice/razer-viper-v2-pro/RZ01-04390100-R3U1', why: 'Flat and low. Better for claw and fingertip grips.', alt: 'Flat, for claw and fingertip' , stockCheckedAt: '2026-10-17' },
      { id: 'gpx2', name: 'Logitech G Pro X Superlight 2', brand: 'Logitech G', model: '910-006628 (Black)', asin: 'B09NBWL8J5', w: 63.5, d: 125, g: 60, grips: ['palm', 'claw', 'fingertip'], hands: ['medium'], tagsSource: 'editorial', dims: { w: 63.5, d: 125, h: 40 }, dimsSource: 'https://support.logi.com/hc/en-us/articles/15235304069783-Specification-G-PRO-X-Superlight-2-Lightspeed-Gaming-Mouse', why: 'Light and symmetrical. Works for most grips and hand sizes.', alt: 'Symmetrical, all-round' , stockCheckedAt: '2026-10-17' },
      { id: 'vv3p', name: 'Razer Viper V3 Pro', brand: 'Razer', model: 'RZ01-05120100-R3U1 (Black)', asin: 'B0CW25XR5R', w: 63.9, d: 127.1, g: 54, grips: ['claw', 'fingertip'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 63.9, d: 127.1, h: 39.9 }, dimsSource: 'https://www.razer.com/gaming-mice/razer-viper-v3-pro', why: 'Symmetrical and very light at 54 g. Long enough for a claw grip on larger hands.', alt: 'Light, symmetrical', stockCheckedAt: '2026-10-17' },
      { id: 'g502xp', name: 'Logitech G502 X PLUS', brand: 'Logitech G', model: 'G502 X PLUS (Black)', asin: 'B092CB69Q4', w: 79.2, d: 131.4, g: 106, grips: ['palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 79.2, d: 131.4, h: 41.1 }, dimsSource: 'https://support.logi.com/hc/en-us/articles/7639125500183-Specification-G502-X-PLUS-Wireless-RGB-Gaming-Mouse', why: 'A big right-handed shape with a thumb rest. At 106 g it is heavy next to the others here.', alt: 'Ergo, lots of buttons', stockCheckedAt: '2026-10-17' },
      { id: 'mxm3s', name: 'Logitech MX Master 3S (Bluetooth Edition)', brand: 'Logitech', model: '910-007499 (Bluetooth Edition, Graphite)', asin: 'B0FB21526X', w: 84.3, d: 124.9, g: 141, grips: ['palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 84.3, d: 124.9, h: 51 }, dimsSource: 'https://support.logi.com/hc/en-hk/articles/31605553413783-Specification-MX-Master-3S-Bluetooth-Edition', why: 'A tall work mouse with a thumb rest and side scroll wheel. The widest mouse here.', alt: 'Work, ergo', stockCheckedAt: '2026-10-17' },
      { id: 'bv3p35', name: 'Razer Basilisk V3 Pro 35K', brand: 'Razer', model: 'RZ01-05240100-R3U1 (Black)', asin: 'B0DG837JYP', w: 75.1, d: 130, g: 112, grips: ['palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 75.1, d: 130, h: 42.5 }, dimsSource: 'https://www.razer.com/gaming-mice/razer-basilisk-v3-pro-35k', why: 'A right-handed shape with a thumb rest and a tilt wheel. 112 g, so it is one of the heavier mice here.', alt: 'Ergo, lots of buttons', stockCheckedAt: '2026-10-17' },
      { id: 'm75air', name: 'Corsair M75 AIR WIRELESS', brand: 'Corsair', model: 'M75 AIR WIRELESS (Black)', asin: 'B0CHN2R8GY', w: 65, d: 128, g: 60, grips: ['palm', 'claw', 'fingertip'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 65, d: 128, h: 41.6 }, dimsSource: 'https://www.corsair.com/ca/fi/explorer/gamer/mice/corsair-m75-air-our-best-mouse-for-competitive-fps-gaming/', why: 'Symmetrical and 60 g. Works for most grips.', alt: 'Light, symmetrical', stockCheckedAt: '2026-10-17' },
      { id: 'harpeace', name: 'ASUS ROG Harpe Ace Aim Lab Edition', brand: 'ASUS', model: 'P713 (Black)', asin: 'B0BSKX9V7C', w: 63.7, d: 127.5, g: 54, grips: ['claw', 'fingertip'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 63.7, d: 127.5, h: 39.6 }, dimsSource: 'https://rog.asus.com/us/mice-mouse-pads/mice/wireless/rog-harpe-ace-aim-lab-edition-model/spec/', why: 'Low and light at 54 g, with a slight right-hand slope. Suits claw and fingertip grips.', alt: 'Light, low', stockCheckedAt: '2026-10-17' },
      { id: 'gsm1pro', name: 'GravaStar Mercury M1 Pro', brand: 'GravaStar', model: 'Mercury M1 Pro (Gradient Pink)', asin: 'B0FRN2Z4JF', w: 64.5, d: 124, g: 88, grips: ['claw', 'fingertip'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 64.5, d: 124, h: 39.5 }, dimsSource: 'https://www.gravastar.com/products/mercury-m1-pro-gunmetal-gray', why: 'An 88 g mouse with a symmetrical magnesium shell.', alt: 'Metal shell', stockCheckedAt: '2026-10-17' },
      { id: 'beastxpro', name: 'WLMOUSE Beast X Pro', brand: 'WLMOUSE', model: 'MK x WLMOUSE Beast X Pro, side slits (Black Dot, Black)', asin: 'B0F1NJG2M5', w: 62, d: 122, g: 39, grips: ['claw', 'fingertip'], hands: ['medium'], tagsSource: 'editorial', dims: { w: 62, d: 122, h: 37 }, dimsSource: 'https://www.wlmouse.com/products/x-pro', why: 'A magnesium shell at 39 g, the lightest mouse here. Symmetrical and low.', alt: 'Ultralight, magnesium', stockCheckedAt: '2026-10-17' },
      { id: 'a7v2u', name: 'MCHOSE A7 V2 Ultra', brand: 'MCHOSE', model: 'A7 V2 Ultra (White)', asin: 'B0FRF6NP21', w: 63.24, d: 125.84, g: 59, grips: ['palm', 'claw'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 63.24, d: 125.84, h: 39.78 }, dimsSource: 'https://www.mchose.store/products/mchose-a7-v2-series-lightweight-all-round-wireless-gaming-mouse', why: 'A symmetrical mouse weighing 59 g.', alt: '59 g, symmetrical', stockCheckedAt: '2026-10-17' },
      { id: 'op18kv2', name: 'Endgame Gear OP1 8k v2', brand: 'Endgame Gear', model: 'EGG-OP1-8K-V2-BLK', asin: 'B0FB8VWW8Y', w: 60.5, d: 118.2, g: 49.5, grips: ['claw', 'fingertip'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 60.5, d: 118.2, h: 37.2 }, dimsSource: 'https://endgamegear.com/products/op1-8k-v2-wired-gaming-mouse', why: 'A small wired symmetrical mouse, 49.5 g.', alt: 'Small, wired', stockCheckedAt: '2026-10-17' },
      { id: 'gm41w', name: 'MSI Clutch GM41 Lightweight Wireless', brand: 'MSI', model: 'CLUTCH GM41 LIGHTWEIGHT WIRELESS', asin: 'B094N6J1WP', w: 67, d: 130.1, g: 74, grips: ['palm', 'claw'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 67, d: 130.1, h: 38.3 }, dimsSource: 'https://www.msi.com/Gaming-Gear/CLUTCH-GM41-LIGHTWEIGHT-WIRELESS/Specification', why: 'Symmetrical, with a charging dock included.', alt: 'With dock', stockCheckedAt: '2026-10-17' },
      { id: 'mobifold', name: 'Logitech Mobi Fold', brand: 'Logitech', model: 'Mobi Fold (Graphite)', asin: 'B0GSXLK8SC', w: 57, d: 122, g: 79, grips: ['palm', 'claw'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 57, d: 122, h: 33 }, dimsSource: 'https://www.logitech.com/content/dam/support/mice/mobi-fold/mobi-fold-ww.pdf', why: 'A folding travel mouse, 79 g.', alt: 'Travel, foldable', stockCheckedAt: '2026-10-17' },
      { id: 'versa300w8k', name: 'MSI Versa 300 Wireless 8K', brand: 'MSI', model: 'VERSA 300 WIRELESS 8K', asin: 'B0GV3NTFVF', w: 64, d: 125, g: 66, grips: ['palm', 'claw'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 64, d: 125, h: 41 }, dimsSource: 'https://us-store.msi.com/Gaming-Gears/Mice/VERSA-300-W-8K', why: 'A symmetrical 66 g mouse with 8000 Hz wireless.', alt: 'Symmetrical, 8K', stockCheckedAt: '2026-10-17' },
      { id: 'op1w4kv2', name: 'Endgame Gear OP1w 4k v2', brand: 'Endgame Gear', model: 'OP1w 4k v2 (Black)', asin: 'B0FCXYT2PV', w: 60.5, d: 118.2, g: 59.5, grips: ['claw', 'fingertip'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 60.5, d: 118.2, h: 37.2 }, dimsSource: 'https://endgamegear.com/products/op1w-4k-v2-wireless-gaming-mouse', why: 'A small wireless claw shape, 59.5 g, at 4000 Hz.', alt: 'Small, wireless', stockCheckedAt: '2026-10-17' },
      { id: 'op1we', name: 'Endgame Gear OP1we', brand: 'Endgame Gear', model: 'OP1we (Black)', asin: 'B0CDCBDGGT', w: 60.5, d: 118.2, g: 58.5, grips: ['claw', 'fingertip'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 60.5, d: 118.2, h: 37.2 }, dimsSource: 'https://endgamegear.com/products/op1we-gaming-mouse', why: 'The budget wireless OP1, 58.5 g.', alt: 'Small, wireless, budget', stockCheckedAt: '2026-10-17' },
      { id: 'xm28k', name: 'Endgame Gear XM2 8k', brand: 'Endgame Gear', model: 'XM2 8k', asin: 'B0DG5YKCDT', w: 66, d: 122, g: 51.5, grips: ['claw', 'palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 66, d: 122, h: 38 }, dimsSource: 'https://endgamegear.com/products/xm2-8k-gaming-mouse', why: 'The XM claw shape for medium to large hands, 51.5 g.', alt: 'Claw, wired', stockCheckedAt: '2026-10-17' },
      { id: 'xm28kv2', name: 'Endgame Gear XM2 8k v2', brand: 'Endgame Gear', model: 'XM2 8k v2', asin: 'B0FL48M4VM', w: 66, d: 122, g: 51.5, grips: ['claw', 'palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 66, d: 122, h: 38 }, dimsSource: 'https://endgamegear.com/products/xm2-8k-gaming-mouse-copy', why: 'The XM claw shape for medium to large hands, 51.5 g.', alt: 'Claw, wired', stockCheckedAt: '2026-10-17' },
      { id: 'xm2w4k', name: 'Endgame Gear XM2w 4k', brand: 'Endgame Gear', model: 'XM2w 4k', asin: 'B0DG5Z9472', w: 66, d: 122, g: 61.5, grips: ['claw', 'palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 66, d: 122, h: 38 }, dimsSource: 'https://endgamegear.com/products/xm2w-4k-wireless-gaming-mouse', why: 'The XM claw shape for medium to large hands, 61.5 g.', alt: 'Claw, wireless', stockCheckedAt: '2026-10-17' },
      { id: 'xm2w4kv2', name: 'Endgame Gear XM2w 4k v2', brand: 'Endgame Gear', model: 'XM2w 4k v2', asin: 'B0FL75DGSF', w: 66, d: 122, g: 61.5, grips: ['claw', 'palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 66, d: 122, h: 38 }, dimsSource: 'https://endgamegear.com/products/xm2w-4k-v2-wireless-gaming-mouse', why: 'The XM claw shape for medium to large hands, 61.5 g.', alt: 'Claw, wireless', stockCheckedAt: '2026-10-17' },
      { id: 'xm2we', name: 'Endgame Gear XM2we', brand: 'Endgame Gear', model: 'XM2we', asin: 'B0BVKZ2RR3', w: 66, d: 122, g: 63, grips: ['claw', 'palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 66, d: 122, h: 38 }, dimsSource: 'https://endgamegear.com/products/xm2we-wireless-gaming-mouse', why: 'The XM claw shape for medium to large hands, 63 g.', alt: 'Claw, wireless', stockCheckedAt: '2026-10-17' },
      { id: 'gm51', name: 'MSI Clutch GM51 Lightweight Wireless', brand: 'MSI', model: 'CLUTCH GM51 LIGHTWEIGHT WIRELESS', asin: 'B0BXL7QYZK', w: 65, d: 122, g: 85, grips: ['palm', 'claw'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 65, d: 122, h: 45 }, dimsSource: 'https://www.msi.com/Gaming-Gear/CLUTCH-GM51-LIGHTWEIGHT-WIRELESS/Specification', why: 'A wireless MSI mouse, 85 g.', alt: 'Ergo, with dock', stockCheckedAt: '2026-10-17' },
      { id: 'versaprow', name: 'MSI Versa PRO Wireless', brand: 'MSI', model: 'VERSA PRO WIRELESS (+ Mouse Dock Pro)', asin: 'B0F2B7P3X6', w: 80, d: 129, g: 97, grips: ['palm'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 80, d: 129, h: 44 }, dimsSource: 'https://es.msi.com/Gaming-Gear/VERSA-PRO-WIRELESS-plus-MOUSE-DOCK-PRO/Specification', why: 'A wide wireless mouse. 97 g. Sold with MSI\'s mouse dock.', alt: 'Ergo, lots of buttons', stockCheckedAt: '2026-10-17' },
      { id: 'magicmouse', name: 'Apple Magic Mouse (USB-C)', brand: 'Apple', model: 'MXK53AM/A (White)', asin: 'B0DL72PK1P', w: 57.1, d: 113.5, g: 99, grips: ['palm', 'claw'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 57.1, d: 113.5, h: 21.6 }, dimsSource: 'https://support.apple.com/en-us/121931', why: 'Flat and short, only {21.6} tall, with a touch surface instead of a wheel.', alt: 'Mac, very low', stockCheckedAt: '2026-10-17' },
      { id: 'asx3', name: 'ATTACK SHARK X3', brand: 'ATTACK SHARK', model: 'X3 (Black)', asin: 'B0CCJR2Q2Q', w: 61, d: 118.5, g: 49, grips: ['claw', 'fingertip'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 61, d: 118.5, h: 39.7 }, dimsSource: 'https://attackshark.com/products/attack-shark-x3-wireless-gaming-mouse-paw3395', why: 'A budget symmetrical mouse at 49 g, so it suits smaller hands.', alt: 'Budget, light', stockCheckedAt: '2026-10-17' },
      { id: 'asr1', name: 'ATTACK SHARK R1', brand: 'ATTACK SHARK', model: 'R1 (White), listed under MAMBASNAKE', asin: 'B0D4QNGC3S', w: 64, d: 123, g: 59, grips: ['palm', 'claw'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 64, d: 123, h: 41 }, dimsSource: 'https://attackshark.com/products/attack-shark-r1-mouse', why: 'A budget symmetrical mouse, 59 g.', alt: 'Budget', stockCheckedAt: '2026-10-17' },
      { id: 'gm340w', name: 'MSI Forge GM340 Wireless (White)', brand: 'MSI', model: 'FORGE GM340 WIRELESS (White)', asin: 'B0GHR5JSFJ', w: 61.5, d: 122, g: 57, grips: ['claw', 'fingertip'], hands: ['small', 'medium'], tagsSource: 'editorial', dims: { w: 61.5, d: 122, h: 38 }, dimsSource: 'https://uk.msi.com/Gaming-Gear/FORGE-GM340-WIRELESS/Specification', why: 'A budget symmetrical mouse, 57 g.', alt: 'Budget, light', stockCheckedAt: '2026-10-17' },
      { id: 'versa300w', name: 'MSI Versa 300 Wireless (White)', brand: 'MSI', model: 'VERSA 300 WIRELESS (White)', asin: 'B0FBFZ3XF5', w: 64, d: 125, g: 60, grips: ['palm', 'claw'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 64, d: 125, h: 41 }, dimsSource: 'https://us.msi.com/Gaming-Gear/VERSA-300-WIRELESS/Specification', why: 'A budget symmetrical mouse at 60 g.', alt: '59 g, symmetrical', stockCheckedAt: '2026-10-17' },
      { id: 'gm08', name: 'MSI Clutch GM08', brand: 'MSI', model: 'CLUTCH GM08', asin: 'B08DDLMGCY', w: 68.5, d: 128, g: 92, grips: ['palm', 'claw'], hands: ['medium', 'large'], tagsSource: 'editorial', dims: { w: 68.5, d: 128, h: 40.5 }, dimsSource: 'https://us.msi.com/Gaming-Gear/CLUTCH-GM08/Specification', why: 'A wired budget mouse with adjustable weights.', alt: 'Budget, wired', stockCheckedAt: '2026-10-17' }
    ]
  };
  var cats = ['monitor', 'keyboard', 'pad', 'mouse'];
  var padLabels = { cloth: 'Cloth', mat: 'Cloth desk mat', glass: 'Glass' };
  var labels = { monitor: 'Monitor', keyboard: 'Keyboard', pad: 'Pad', mouse: 'Mouse' };
  var gripWords = { palm: 'palm grip', claw: 'claw grip', fingertip: 'fingertip grip' };
  var handWords = { small: 'small hands', medium: 'medium hands', large: 'large hands' };
  var useWords = { gaming: 'gaming', work: 'work', both: 'gaming and work' };

  // woot60 was this slot's id. Old share links and saved picks still use it.
  var idAlias = { woot60: 'hv3m' };
  function get(cat, id){
    var want = idAlias[id] || id, list = catalog[cat];
    if (!list) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === want) return list[i];
    return null;
  }
  function forSale(item){ return !!(item && item.retired !== true); }
  // Desk mats are the catalog's kind "mat". A mat may lie under the monitor base. A mouse pad may not.
  function isMat(item){ return !!(item && item.kind === 'mat'); }

  // Each slot recommend() fills is an ordered list of product ids. The first id
  // that exists and is not retired wins, so selling a different model is a data change.
  var preferences = {
    monitor: {
      default: ['mon27', 'xg27acs'],
      // No verified ultrawide yet. This stays its own list so a later swap is a one-line data change.
      wide: ['mon34', 'xg27acs'],
      shallow: ['mon24']
    },
    keyboard: {
      k75: ['k75'],
      full: ['full'],
      tkl: ['tkl']
    },
    pad: {
      mat: ['mat'],
      small: ['clothm', 'qckm', 'g640'],
      default: ['cloth']
    },
    mouse: {
      default: ['gpx2', 'vv3p'],
      da3: ['da3', 'ec2c'],
      ec2c: ['ec2c', 'da3'],
      // Claw and fingertip pick vv2p today. The next id is there so retiring vv2p is a data change.
      vv2p: ['vv2p', 'vv3p'],
      gpx2: ['gpx2', 'vv3p'],
      vv3p: ['vv3p', 'gpx2']
    }
  };
  // Decision 13. Rule 2 tries the desk's short list, then these ids. This is the only pad-order list;
  // callers read it through activePads(), so a retired pad drops out everywhere.
  var padOrder = ['cloth', 'clothm', 'mat', 'glass', 'qckm', 'g640', 'g840', 'gigv2xxl', 'mm350xl', 'honeacexxl', 'sp004a', 'hienxl', 'zgsriii', 'zgsrsebi', 'zgsrseorange', 'zhsriii', 'zhsrseorange', 'zhsrserougeii', 'zhtr', 'emb', 'emc'];
  function activePads(){
    return padOrder.filter(function(id){ return forSale(get('pad', id)); });
  }
  function preferenceIds(cat){
    var ids = {};
    var slots = preferences[cat];
    for (var slot in slots) slots[slot].forEach(function(id){ ids[id] = true; });
    return ids;
  }
  function firstActive(cat, ids){
    for (var i = 0; i < ids.length; i++) {
      var item = get(cat, ids[i]);
      if (forSale(item)) return item.id;
    }
    return null;
  }

  // One helper builds every tagged product link from the ASIN. The tag is not stored on the product.
  var AMAZON_TAG = 'setupviz-20';
  function amazonLink(asin){
    return 'https://www.amazon.com/dp/' + asin + '?tag=' + AMAZON_TAG;
  }
  function cartLink(asins){
    var q = ['AssociateTag=' + AMAZON_TAG];
    for (var i = 0; i < asins.length; i++) {
      var n = i + 1;
      q.push('ASIN.' + n + '=' + asins[i]);
      q.push('Quantity.' + n + '=1');
    }
    return 'https://www.amazon.com/gp/aws/cart/add.html?' + q.join('&');
  }
  function measurementInfo(item){
    var source = item.dimsSource;
    var safe = typeof source === 'string' && /^https:\/\//.test(source);
    var href = safe ? source.replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }) : '';
    return '<details class="measurement-info" style="font-size:12px;color:#8F8F8F"><summary>Measurements &amp; estimates</summary><p>' +
      (safe ? '<a href="' + href + '" target="_blank" rel="noopener">Catalog measurement source</a>. ' : 'Measurement source not recorded; verify with the manufacturer. ') +
      'Dimensions may be rounded. Confirm the exact model and measurements before buying.' +
      (item.base ? ' Stock stand outlines and panel positions are estimates from drawings and product photos at neutral tilt; they are not measured 3D models. <a href="https://github.com/Setupviz/setupviz/blob/main/web/monitor-stands.md" target="_blank" rel="noopener">Stand references and estimation notes</a>.' : '') +
      '</p></details>';
  }
  function buyLine(item){
    if (!forSale(item)) return '<p class="unavail">Not currently available</p>';
    if (!item.asin) return '<a class="amz" href="https://www.amazon.com/s?k=' + encodeURIComponent(item.name) + '" rel="noopener" target="_blank">Find this model on Amazon</a>';
    return '<p class="paid">Paid link · We may earn a commission.</p><a class="amz" href="' + amazonLink(item.asin) + '" rel="sponsored nofollow noopener" target="_blank" aria-label="See today\'s price on Amazon (opens in a new tab)">See today\'s price on Amazon</a>';
  }

  function answers(){
    function read(k){ try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
    return { grip: read('sv-grip'), hand: read('sv-hand'), use: read('sv-use') };
  }
  function answerText(a){
    var parts = [gripWords[a.grip], handWords[a.hand], useWords[a.use]].filter(Boolean);
    return parts.length ? parts.join(' · ') : '';
  }

  // our picks for these answers and this desk
  // Score retired mice too, so a grip still selects the same slot. The slot's list
  // then skips anyone retired, which keeps a retired mouse out of the result.
  function mouseSlot(a){
    var scored = catalog.mouse.map(function(m, i){
      var s = 0;
      if (a.grip && a.grip !== 'unsure' && m.grips.indexOf(a.grip) >= 0) s += m.grips.length < 3 ? 2.5 : 2;
      if (a.hand && a.hand !== 'unsure' && m.hands.indexOf(a.hand) >= 0) s += 1;
      return { id: m.id, s: s, i: i };
    }).sort(function(x, y){ return y.s - x.s || x.i - y.i; });
    // A mouse with no preference list can be picked by hand. It must not take the slot,
    // or a new model would change the recommendation without a data edit to the lists.
    for (var si = 0; si < scored.length; si++) {
      if (scored[si].s > 0 && preferences.mouse[scored[si].id]) return scored[si].id;
    }
    return null;
  }
  function recommend(a, desk){
    return scoreRecommend(a, desk);
  }
  // Products main's recommend can return. A model added later must not change the monitor, keyboard, or mouse.
  var mainIds = {
    monitor: ['mon27', 'mon24', 'mon34'],
    keyboard: ['tkl', 'k75', 'full', 'gsv60', 'hv3m'],
    // Main's four pads are rule 2b's first four.
    pad: padOrder.slice(0, 4),
    mouse: ['da3', 'ec2c', 'vv2p', 'gpx2']
  };
  function legacyMouse(a){
    var ids = mainIds.mouse, best = null, bestS = 0;
    for (var i = 0; i < ids.length; i++) {
      var m = get('mouse', ids[i]);
      if (!m) continue;
      var s = 0;
      if (a.grip && a.grip !== 'unsure' && m.grips.indexOf(a.grip) >= 0) s += m.grips.length < 3 ? 2.5 : 2;
      if (a.hand && a.hand !== 'unsure' && m.hands.indexOf(a.hand) >= 0) s += 1;
      if (s > bestS) { best = m.id; bestS = s; }
    }
    return best || 'gpx2';
  }
  function legacyChoices(cat, pref){
    var ids = mainIds[cat], out = [pref];
    for (var i = 0; i < ids.length; i++) if (ids[i] !== pref) out.push(ids[i]);
    out.push(null);
    return out;
  }
  function legacyRank(desk, pick, preferred){
    var wont = legacyWont(desk, pick), omitted = 0, changed = 0;
    cats.forEach(function(c){
      if (!pick[c]) omitted++;
      else if (pick[c] !== preferred[c]) changed++;
    });
    return [wont, omitted, changed];
  }
  // Main's search, on main's products, with main's rounded layout. The pad may still change afterwards.
  function legacyRecommend(a, desk){
    var mouse = legacyMouse(a);
    var keyboard = desk.w < 1100 ? 'k75' : desk.w >= 1600 && a.use === 'work' ? 'full' : 'tkl';
    var monitor = desk.d < 600 ? 'mon24' : desk.w >= 1600 && (a.use === 'work' || a.use === 'both') ? 'mon34' : 'mon27';
    var pad = desk.w >= 1300 ? 'mat' : desk.w < 1100 || desk.d < 600 ? 'clothm' : 'cloth';
    var preferred = { monitor: monitor, keyboard: keyboard, pad: pad, mouse: mouse };
    var best = preferred, bestKey = legacyRank(desk, preferred, preferred);
    if (bestKey[0] === 0) return best;
    var monitors = legacyChoices('monitor', monitor), keyboards = legacyChoices('keyboard', keyboard);
    var pads = legacyChoices('pad', pad), mice = legacyChoices('mouse', mouse);
    for (var mi = 0; mi < monitors.length; mi++) {
      var m = monitors[mi];
      for (var ki = 0; ki < keyboards.length; ki++) {
        var k = keyboards[ki];
        for (var pi = 0; pi < pads.length; pi++) {
          var p = pads[pi];
          var omitted = (m ? 0 : 1) + (k ? 0 : 1) + (p ? 0 : 1);
          var changed = (m && m !== preferred.monitor ? 1 : 0) + (k && k !== preferred.keyboard ? 1 : 0) + (p && p !== preferred.pad ? 1 : 0);
          if (!lower([legacyWont(desk, { monitor: m, keyboard: k, pad: p, mouse: null }), omitted, changed], bestKey)) continue;
          for (var oi = 0; oi < mice.length; oi++) {
            var pick = { monitor: m, keyboard: k, pad: p, mouse: mice[oi] }, key = legacyRank(desk, pick, preferred);
            if (!lower(key, bestKey)) continue;
            bestKey = key;
            best = pick;
            if (bestKey[0] === 0 && bestKey[1] === 0 && bestKey[2] === 0) return best;
          }
        }
      }
    }
    return best;
  }
  function scoreRecommend(a, desk){
    var base = legacyRecommend(a, desk);
    return { monitor: base.monitor, keyboard: base.keyboard, pad: selectPad(desk, base, padListFor(desk)), mouse: base.mouse };
  }
  function padListFor(desk){
    return desk.w >= 1300 ? preferences.pad.mat : desk.w < 1100 || desk.d < 600 ? preferences.pad.small : preferences.pad.default;
  }
  // The pad main would ship, placed the way main places it: rounded, and a mat may step off the stand.
  // A won't-fit here is main's won't-fit. A mat under the stand counts, and a keyboard on a mouse pad does not.
  function legacyOnDesk(desk, rect){ return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= desk.w + 1e-6 && rect.y + rect.d <= desk.d + 1e-6; }
  function legacyClear(desk, pick, pos, rect){
    if (!pos.monitor || !pick.monitor) return { x: rect.x, y: rect.y };
    var m = size('monitor', pick), front = pos.monitor.y + m.d;
    var base = { x: pos.monitor.x + (m.w - m.base[0]) / 2, y: front - m.base[1], w: m.base[0], d: m.base[1] };
    if (!overlap(base, rect)) return { x: rect.x, y: rect.y };
    var spots = [
      { x: Math.ceil(base.x + base.w), y: rect.y },
      { x: Math.floor(base.x - rect.w), y: rect.y }
    ];
    var best = null, shift = Infinity;
    spots.forEach(function(spot){
      var next = { x: spot.x, y: spot.y, w: rect.w, d: rect.d };
      var moved = Math.abs(spot.x - rect.x);
      if (legacyOnDesk(desk, next) && !overlap(base, next) && moved < shift) { best = spot; shift = moved; }
    });
    if (best) return best;
    var y = Math.round(front + 10);
    var fwd = { x: rect.x, y: y, w: rect.w, d: rect.d };
    if (rect.d <= desk.d - y && legacyOnDesk(desk, fwd) && !overlap(base, fwd)) return { x: rect.x, y: y };
    return { x: rect.x, y: rect.y };
  }
  // Main places every slot, even a missing id, because the mouse's spot is measured from that keyboard.
  function legacyLayout(desk, pick){
    var pos = {}, cx = desk.w / 2;
    pos.monitor = { x: Math.round(cx - size('monitor', pick).w / 2), y: 20 };
    var kb = size('keyboard', pick), kx = Math.round(Math.max(30, cx - 320)), ky = desk.d - 260;
    var kbAt = legacyClear(desk, pick, pos, { x: kx, y: ky, w: kb.w, d: kb.d });
    pos.keyboard = { x: kbAt.x, y: kbAt.y };
    var pd = size('pad', pick), py = desk.d - pd.d - (pd.kind === 'mat' ? 40 : 30);
    var px = Math.round(pd.kind === 'mat' ? cx - pd.w / 2 : Math.min(cx + 120, desk.w - pd.w - 30));
    var padAt = legacyClear(desk, pick, pos, { x: px, y: py, w: pd.w, d: pd.d });
    pos.pad = { x: padAt.x, y: padAt.y };
    var mw = size('mouse', pick), mx = pos.keyboard.x + size('keyboard', pick).w + 160, my = desk.d - 270;
    if (pick.pad) {
      var pp = pos.pad, ps = size('pad', pick);
      mx = Math.max(pp.x + 40, Math.min(pp.x + ps.w - mw.w - 40, Math.max(mx, pp.x + 120)));
      my = Math.max(pp.y + 40, Math.min(pp.y + ps.d - mw.d - 40, my));
    }
    var mouseAt = legacyClear(desk, pick, pos, { x: Math.round(mx), y: Math.round(my), w: mw.w, d: mw.d });
    pos.mouse = { x: mouseAt.x, y: mouseAt.y };
    return pos;
  }
  function legacyWont(desk, pick){
    var pos = legacyLayout(desk, pick), bad = {};
    function rect(c){ var s = size(c, pick); return { x: pos[c].x, y: pos[c].y, w: s.w, d: s.d }; }
    function mark(c){ if (pick[c] && pos[c]) bad[c] = true; }
    cats.forEach(function(c){
      if (!pick[c] || !pos[c]) return;
      var r = rect(c);
      if (r.x < 0 || r.y < 0 || r.x + r.w > desk.w || r.y + r.d > desk.d) bad[c] = true;
    });
    if (pick.keyboard && pick.pad && pos.keyboard && pos.pad && size('pad', pick).kind === 'glass' && overlap(rect('keyboard'), rect('pad'))) { mark('keyboard'); mark('pad'); }
    if (pick.mouse && pick.keyboard && pos.mouse && pos.keyboard && overlap(rect('mouse'), rect('keyboard'))) { mark('mouse'); mark('keyboard'); }
    if (pick.monitor && pos.monitor) {
      var mon = size('monitor', pick), front = pos.monitor.y + mon.d;
      var stand = { x: pos.monitor.x + (mon.w - mon.base[0]) / 2, y: front - mon.base[1], w: mon.base[0], d: mon.base[1] };
      var hit = false;
      ['keyboard', 'pad', 'mouse'].forEach(function(c){ if (pick[c] && pos[c] && overlap(stand, rect(c))) { mark(c); hit = true; } });
      if (hit) mark('monitor');
    }
    var n = 0;
    cats.forEach(function(c){ if (bad[c]) n++; });
    return n;
  }
  // Rule 2. Keep main's pad when the build layout Fits. Otherwise the first Fits
  // pad in the desk list, then padTry. A crossing small pad that fails the four
  // conditions is not Fits, so the walk continues. Nothing Fits: the first Tight
  // pad. Every pad Won't fit: no pad.
  function selectPad(desk, base, list){
    var prior = base.pad, priorItem = prior && get('pad', prior);
    if (!(priorItem && forSale(priorItem))) prior = null;
    if (prior && padLevel(desk, base, prior) === 0) return prior;
    var seen = {}, tight = null;
    function walk(items){
      for (var i = 0; i < items.length; i++) {
        var item = items[i] && items[i].id ? items[i] : get('pad', items[i]);
        if (!item || !forSale(item) || seen[item.id]) continue;
        seen[item.id] = true;
        var lvl = padLevel(desk, base, item.id);
        if (lvl === 0) return item.id;
        if (lvl === 1 && !tight) tight = item.id;
      }
      return null;
    }
    return walk(list) || walk(activePads()) || tight;
  }
  // Decision 17, on the build layout only. A small pad may cross the centre when
  // it clears the keyboard, overlaps neither the keyboard nor the stand, keeps
  // 30 mm on every edge, and the mouse is centred. Missing any of those is Tight,
  // not Won't fit, unless the fit check is already worse.
  function crossingPadTight(desk, pick, pos){
    if (!pick.pad || !pos || !pos.pad) return false;
    var pad = get('pad', pick.pad);
    if (!pad || isMat(pad)) return false;
    var rect = { x: pos.pad.x, y: pos.pad.y, w: pad.w, d: pad.d };
    var cx = desk.w / 2;
    if (!(rect.x < cx - 1e-6 && rect.x + rect.w > cx + 1e-6)) return false;
    var past = false;
    if (pick.keyboard && pos.keyboard) {
      var kb = get('keyboard', pick.keyboard);
      past = rect.x >= pos.keyboard.x + kb.w - 1e-6;
      if (overlap(rect, { x: pos.keyboard.x, y: pos.keyboard.y, w: kb.w, d: kb.d })) return true;
    }
    if (pick.monitor && pos.monitor && standOverlap(standBox(pick, pos), rect)) return true;
    if (Math.min(rect.x, desk.w - rect.x - rect.w, desk.d - rect.y - rect.d, rect.y) < 30) return true;
    if (!past) return true;
    if (!pick.mouse || !pos.mouse) return true;
    var mouse = get('mouse', pick.mouse);
    var cxp = rect.x + (pad.w - mouse.w) / 2, cyp = rect.y + (pad.d - mouse.d) / 2;
    return Math.abs(pos.mouse.x - cxp) > 2 || Math.abs(pos.mouse.y - cyp) > 2;
  }
  function padLevel(desk, base, id){
    var pick = { monitor: base.monitor, keyboard: base.keyboard, pad: id, mouse: base.mouse };
    var pos = layout(desk, pick);
    var st = check({ desk: desk, pick: pick, pos: pos }, blank);
    var lvl = st.pad ? st.pad.lvl : 2;
    if (lvl < 2 && crossingPadTight(desk, pick, pos)) lvl = 1;
    return lvl;
  }
  function blank(){ return ''; }
  function lower(a, b){ for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; }
  var leftPhrase = { monitor: 'a monitor', keyboard: 'a keyboard', pad: 'a mouse pad', mouse: 'a mouse' };
  function leftList(ids){
    var list = ids.map(function(c){ return leftPhrase[c]; });
    if (list.length < 2) return list[0] || '';
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }
  // sentence for pieces we did not place because nothing in that slot fits, or ''
  function omission(desk, pick){
    var missing = cats.filter(function(c){ return !pick[c]; });
    var blocked = missing.filter(function(c){
      var allowed = preferenceIds(c);
      return !catalog[c].some(function(item){
        if (!forSale(item) || (c !== 'pad' && !allowed[item.id])) return false;
        var trial = {};
        cats.forEach(function(k){ trial[k] = pick[k]; });
        trial[c] = item.id;
      var st = check({ desk: desk, pick: trial, pos: layout(desk, trial) }, function(m){ return Math.round(m) + ' mm'; });
      for (var k in st) if (st[k].lvl === 2) return false;
      // Same rule as selectPad: a pad is available when it Fits or is Tight. Won't fit does not count.
      if (c === 'pad') {
        var padLvl = st.pad ? st.pad.lvl : 2;
        if (padLvl !== 0 && padLvl !== 1) return false;
      }
      return true;
      });
    });
    if (!blocked.length) return '';
    return 'No room for ' + leftList(blocked) + ' in the suggested layout. Try moving a piece or choosing a smaller model.';
  }
  // one line on why a pick matches the answers, or '' when the answers don't say
  function matchReason(cat, s, a){
    if (cat !== 'mouse') return '';
    var notes = [];
    if (gripWords[a.grip]) {
      notes.push(s.grips.includes(a.grip) ? 'Matches your ' + gripWords[a.grip] + '.' : 'A different shape may suit your ' + gripWords[a.grip] + ' better.');
    }
    if (handWords[a.hand]) {
      notes.push(s.hands.includes(a.hand) ? 'Sized for ' + handWords[a.hand] + '.' : 'Our size guide pairs this mouse with ' + s.hands.join(' or ') + ' hands.');
    }
    return notes.join(' ');
  }

  // default spots on the desk for each piece
  function size(cat, pick){ return (pick[cat] && get(cat, pick[cat])) || catalog[cat][0]; }
  function onDesk(desk, rect){ return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= desk.w + 1e-6 && rect.y + rect.d <= desk.d + 1e-6; }
  // Stand outlines are percentages of the manufacturer's stand W × D. Top is the back of the desk.
  // Model assignments use the photos in dimsSource and MSI's model galleries. Panel offsets
  // are read from neutral side/top views, estimated from related hardware for oblique-only views.
  var outlines = {
    dell: [[5,0],[95,0],[99,3],[100,8],[100,92],[99,97],[95,100],[5,100],[1,97],[0,92],[0,8],[1,3]],
    rog: [[7,0],[93,0],[100,18],[92,100],[8,100],[0,18]],
    shield: [[14,0],[86,0],[100,17],[94,90],[53,100],[47,100],[6,90],[0,17]],
    bevel: [[10,0],[90,0],[100,17],[96,82],[84,98],[50,100],[16,98],[4,82],[0,17]],
    compact: [[18,0],[82,0],[100,20],[94,88],[65,100],[35,100],[6,88],[0,20]],
    insetPlate: [[23,10],[77,10],[100,21],[94,85],[63,93],[37,93],[6,85],[0,21]],
    rectangle: [[2,0],[98,0],[100,3],[100,97],[98,100],[2,100],[0,97],[0,3]],
    tripod: [[48,0],[52,0],[55,39],[100,96],[99,100],[52,56],[48,56],[1,100],[0,96],[45,39]],
    fork: [[39,0],[61,0],[72,43],[100,94],[99,100],[54,49],[46,49],[1,100],[0,94],[28,43]]
  };
  function polygonArea(points){
    var sum = 0;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++)
      sum += points[j][0] * points[i][1] - points[i][0] * points[j][1];
    return Math.abs(sum) / 2;
  }
  function standIntersection(base, rect){
    if (!overlap(base, rect)) return [];
    // Clip the footprint to the item's four edges. A shared edge has zero area.
    var points = base.shape;
    function clip(axis, limit, direction){
      var result = [];
      for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
        var a = points[j], b = points[i];
        var insideA = direction * (a[axis] - limit) >= 0, insideB = direction * (b[axis] - limit) >= 0;
        if (insideA !== insideB) {
          var t = (limit - a[axis]) / (b[axis] - a[axis]);
          result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
        }
        if (insideB) result.push(b);
      }
      points = result;
    }
    clip(0, (rect.x - base.x) * 100 / base.w, 1);
    clip(0, (rect.x + rect.w - base.x) * 100 / base.w, -1);
    clip(1, (rect.y - base.y) * 100 / base.d, 1);
    clip(1, (rect.y + rect.d - base.y) * 100 / base.d, -1);
    return polygonArea(points) > 1e-8 ? points : [];
  }
  function standOverlap(base, rect){
    return standIntersection(base, rect).length > 0;
  }
  function drawMonitor(el, m){
    if (el.dataset.drawnMonitor === m.id) return;
    el.dataset.drawnMonitor = m.id;
    var w = m.w, d = m.d, half = w / 2, front = d * m.panelFrontPct / 100;
    var back = front - m.panelDepth;
    var sag = m.curveRadius ? m.curveRadius - Math.sqrt(m.curveRadius * m.curveRadius - half * half) : 0;
    var face = 'M0 ' + front + ' Q' + half + ' ' + (front - 2 * sag) + ' ' + w + ' ' + front;
    var housing = face + ' l0 -7 Q' + (w * .77) + ' ' + back + ' ' + half + ' ' + back +
      ' Q' + (w * .23) + ' ' + back + ' 0 ' + (front - 7) + ' Z';
    var stand = outlines[m.standShape].map(function(p){
      return [(w - m.base[0]) / 2 + p[0] * m.base[0] / 100, d - m.base[1] + p[1] * m.base[1] / 100].join(',');
    }).join(' ');
    var mount = d - m.base[1] + m.base[1] * (m.standShape === 'tripod' || m.standShape === 'fork' ? .42 : .18);
    el.innerHTML = '<svg class="monitor-plan" aria-hidden="true" viewBox="0 0 ' + w + ' ' + d + '" preserveAspectRatio="none">' +
      '<defs><pattern id="stand-contact-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="4" height="10" fill="#151515"/></pattern></defs><polygon class="stand-outline" points="' + stand + '"/><path class="stand-post" d="M' + half + ' ' + mount + ' V' + (front - sag) + '"/>' +
      '<path class="panel-housing" d="' + housing + '"/><path class="panel-face" d="' + face + '"/></svg>';
  }
  // The overlay uses the same clipped outline as the fit warning, including the gap between feet.
  function markPadContact(el, pick, pos){
    var svg = el.querySelector('.monitor-plan'), mark = svg.querySelector('.pad-contact');
    var pad = pick.pad && get('pad', pick.pad), base = standBox(pick, pos);
    var points = pad && pos.pad ? standIntersection(base, { x: pos.pad.x, y: pos.pad.y, w: pad.w, d: pad.d }) : [];
    if (!points.length) {
      if (mark) { mark.nextElementSibling.remove(); mark.remove(); }
      return;
    }
    if (!mark) {
      mark = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      mark.setAttribute('class', 'pad-contact');
      mark.id = 'stand-pad-contact';
      var stripes = document.createElementNS(mark.namespaceURI, 'use');
      stripes.setAttribute('href', '#stand-pad-contact');
      stripes.setAttribute('fill', 'url(#stand-contact-hatch)');
      svg.append(mark, stripes);
    }
    svg.style.fill = isMat(pad) ? '#f5c542' : '#ff6b5b';
    mark.setAttribute('points', points.map(function(p){
      return [base.x - pos.monitor.x + p[0] * base.w / 100, base.y - pos.monitor.y + p[1] * base.d / 100].join(',');
    }).join(' '));
  }
  function standBox(pick, pos){
    var m = size('monitor', pick), front = pos.monitor.y + m.d;
    return { x: pos.monitor.x + (m.w - m.base[0]) / 2, y: front - m.base[1], w: m.base[0], d: m.base[1], shape: outlines[m.standShape], front: front };
  }
  // Right of the stand, then left, then one step in front. Exact millimetres, no rounding.
  function besideStand(desk, pick, pos, rect){
    if (!pos.monitor || !pick.monitor) return { x: rect.x, y: rect.y };
    var base = standBox(pick, pos);
    if (!standOverlap(base, rect)) return { x: rect.x, y: rect.y };
    var spots = [{ x: base.x + base.w, y: rect.y }, { x: base.x - rect.w, y: rect.y }];
    var best = null, shift = Infinity;
    spots.forEach(function(spot){
      var next = { x: spot.x, y: spot.y, w: rect.w, d: rect.d };
      var moved = Math.abs(spot.x - rect.x);
      if (onDesk(desk, next) && !standOverlap(base, next) && moved < shift) { best = spot; shift = moved; }
    });
    if (best) return best;
    var y = base.front + 10;
    var fwd = { x: rect.x, y: y, w: rect.w, d: rect.d };
    if (rect.d <= desk.d - y && onDesk(desk, fwd) && !standOverlap(base, fwd)) return { x: rect.x, y: y };
    return { x: rect.x, y: rect.y };
  }
  // mode 'front' puts any keyboard in front of the monitor. 'beside' keeps it off the stand.
  function arrange(desk, pick, mode){
    var pos = {}, cx = desk.w / 2;
    var mon = pick.monitor && get('monitor', pick.monitor);
    if (mon) pos.monitor = { x: cx - mon.w / 2, y: 20 };
    var kb = pick.keyboard && get('keyboard', pick.keyboard);
    var kbPos = null;
    if (kb) {
      var x = Math.max(30, cx - 320);
      if (mode === 'front' && mon) kbPos = { x: x, y: Math.max(desk.d - 260, pos.monitor.y + mon.d + 10) };
      else if (mon) kbPos = besideStand(desk, pick, pos, { x: x, y: desk.d - 260, w: kb.w, d: kb.d });
      else kbPos = { x: x, y: desk.d - 260 };
      pos.keyboard = kbPos;
    }
    var pad = pick.pad && get('pad', pick.pad);
    if (pad) {
      if (isMat(pad)) {
        var y = desk.d - pad.d - 40;
        if (y < 0) y = Math.max(0, desk.d - pad.d);
        var mx = cx - pad.w / 2;
        if (pad.w <= desk.w) mx = Math.max(0, Math.min(desk.w - pad.w, mx));
        pos.pad = { x: mx, y: y };
      } else {
        var y0 = Math.max(0, desk.d - pad.d - 30);
        var x0 = Math.min(cx + 120, desk.w - pad.w - 30);
        var at = { x: x0, y: y0 };
        if (mon) {
          var base = standBox(pick, pos);
          if (standOverlap(base, { x: x0, y: y0, w: pad.w, d: pad.d })) {
            var right = { x: base.x + base.w, y: y0, w: pad.w, d: pad.d };
            if (onDesk(desk, right) && !standOverlap(base, right)) at = { x: right.x, y: right.y };
            else {
              var fy = base.y + base.d + 10;
              var fwd = { x: x0, y: fy, w: pad.w, d: pad.d };
              if (pad.d <= desk.d - fy && onDesk(desk, fwd) && !standOverlap(base, fwd)) at = { x: x0, y: fy };
            }
          }
        }
        pos.pad = at;
      }
    }
    var mouse = pick.mouse && get('mouse', pick.mouse);
    if (mouse) {
      var kbx = kbPos ? kbPos.x : Math.max(30, cx - 320);
      var kbw = kb ? kb.w : 0;
      var wantX = kbx + kbw + 160, wantY = desk.d - 270;
      if (pad && isMat(pad)) {
        var pp = pos.pad;
        pos.mouse = {
          x: Math.max(pp.x + 40, Math.min(pp.x + pad.w - mouse.w - 40, wantX)),
          y: Math.max(pp.y + 40, Math.min(pp.y + pad.d - mouse.d - 40, wantY))
        };
      } else if (pad) pos.mouse = { x: pos.pad.x + (pad.w - mouse.w) / 2, y: pos.pad.y + (pad.d - mouse.d) / 2 };
      else if (mon) pos.mouse = besideStand(desk, pick, pos, { x: wantX, y: wantY, w: mouse.w, d: mouse.d });
      else pos.mouse = { x: wantX, y: wantY };
    }
    return pos;
  }
  // In front only when the whole layout Fits. Otherwise the keyboard stays beside the stand.
  function specLayout(desk, pick){
    if (pick.monitor && get('monitor', pick.monitor)) {
      var front = arrange(desk, pick, 'front');
      if (pieceLevels(desk, pick, front).worst === 0) return front;
    }
    return arrange(desk, pick, 'beside');
  }
  function place(cat, desk, pick, pos){
    var laid = specLayout(desk, pick);
    if (laid[cat]) pos[cat] = { x: laid[cat].x, y: laid[cat].y };
    return pos;
  }
  function pieceLevels(desk, pick, pos){
    var st = check({ desk: desk, pick: pick, pos: pos }, blank);
    var levels = { worst: 0 };
    cats.forEach(function(c){
      if (!pick[c] || !st[c]) return;
      levels[c] = st[c].lvl;
      if (st[c].lvl > levels.worst) levels.worst = st[c].lvl;
    });
    return levels;
  }
  // Rule 1 is the worst piece only, on the same products. A fallback copies the keyboard, pad, and mouse.
  // The monitor stays where specLayout put it. A mat is kept centered only when that layout Fits.
  function layout(desk, pick){
    var pos = specLayout(desk, pick);
    var legacy = legacyLayout(desk, pick);
    var ours = pieceLevels(desk, pick, pos);
    var theirs = pieceLevels(desk, pick, legacy);
    var mat = pick.pad && isMat(size('pad', pick));
    if (!(mat && ours.worst !== 0) && !(ours.worst > theirs.worst)) return pos;
    var out = {};
    if (pos.monitor) out.monitor = { x: pos.monitor.x, y: pos.monitor.y };
    ['keyboard', 'pad', 'mouse'].forEach(function(c){
      if (pick[c] && legacy[c]) out[c] = { x: legacy[c].x, y: legacy[c].y };
    });
    // Main's copy was measured from a rounded monitor. The exact monitor can move the stand by under 1 mm, so pull a copied piece off that stand.
    ['keyboard', 'pad', 'mouse'].forEach(function(c){
      if (!out[c] || !pick[c] || (c === 'pad' && isMat(size('pad', pick)))) return;
      var s = get(c, pick[c]);
      var at = besideStand(desk, pick, out, { x: out[c].x, y: out[c].y, w: s.w, d: s.d });
      out[c] = { x: at.x, y: at.y };
    });
    return out;
  }
  // A monitor or keyboard swap keeps a mouse pad that still Fits or is Tight.
  // A pad that can only sit under the stand is left off, which is how main scores that desk.
  function settle(desk, pick){
    if (!pick.pad || isMat(size('pad', pick))) return pick;
    var pos = layout(desk, pick);
    var on = pieceLevels(desk, pick, pos);
    if (on.pad == null || on.pad < 2) return pick;
    var next = { monitor: pick.monitor || null, keyboard: pick.keyboard || null, pad: null, mouse: pick.mouse || null };
    var off = pieceLevels(desk, next, layout(desk, next));
    var worse = false;
    cats.forEach(function(c){
      if (c === 'pad' || !next[c]) return;
      if ((off[c] == null ? 0 : off[c]) > (on[c] == null ? 0 : on[c])) worse = true;
    });
    if (worse) return pick;
    return next;
  }
  // Compare products in place. Only an added item needs a starting position.
  function retarget(desk, pick, pos, cat, id){
    var previous = pick[cat];
    pick[cat] = id;
    if (!previous || !pos[cat]) pos[cat] = layout(desk, pick)[cat];
    else if (cat === 'monitor') {
      var dx = (get(cat, previous).w - get(cat, id).w) / 2;
      pos[cat] = { x: pos[cat].x + dx, y: pos[cat].y };
    }
    return pos;
  }
  function previewSetup(desk, pick, pos, cat, id){
    var next = { pick: {}, pos: {} };
    cats.forEach(function(c){ next.pick[c] = pick[c] || null; if (pos[c]) next.pos[c] = { x: pos[c].x, y: pos[c].y }; });
    retarget(desk, next.pick, next.pos, cat, id);
    return next;
  }
  function usedArea(setup){
    var pick = setup.pick, pos = setup.pos, area = 0;
    function item(c){ return pick[c] && get(c, pick[c]); }
    var mon = item('monitor'), kb = item('keyboard'), pad = item('pad'), mouse = item('mouse');
    if (mon) area += polygonArea(outlines[mon.standShape]) / 10000 * mon.base[0] * mon.base[1];
    if (kb) area += kb.w * kb.d;
    if (pad) area += pad.w * pad.d;
    if (kb && pad) area -= overlap({ x: pos.keyboard.x, y: pos.keyboard.y, w: kb.w, d: kb.d }, { x: pos.pad.x, y: pos.pad.y, w: pad.w, d: pad.d });
    if (mouse && !pad) area += mouse.w * mouse.d;
    return area;
  }
  function overhangSides(desk, rect){
    return [['left', Math.max(0, -rect.x)], ['right', Math.max(0, rect.x + rect.w - desk.w)], ['top', Math.max(0, -rect.y)], ['bottom', Math.max(0, rect.y + rect.d - desk.d)]].filter(function(side){ return side[1] > 1e-6; });
  }
  // Under 1.27 mm, one decimal inch is "0". Two decimals still names the distance, and never prints a bare 0.
  function hangText(mm, unit){
    var shown = measureText(mm, unit);
    if (shown && shown !== '0') return shown;
    var v = unit === 'cm' ? mm / 10 : mm / 25.4, n = Math.round(v * 100) / 100;
    if (!(n > 0)) return '';
    return n.toFixed(2).replace(/0$/, '');
  }
  function hangNote(desk, rect){
    var groups = [];
    overhangSides(desk, rect).forEach(function(side){
      var inches = hangText(side[1], 'in'), cm = hangText(side[1], 'cm');
      if (!inches || !cm) return;
      var group = groups.find(function(g){ return g.inches === inches && g.cm === cm; });
      if (group) group.names.push(side[0]);
      else groups.push({ inches: inches, cm: cm, names: [side[0]] });
    });
    if (!groups.length) return '';
    function joined(parts){
      return parts.length < 3 ? parts.join(' and ') : parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
    }
    return 'Hangs ' + joined(groups.map(function(group){
      return group.inches + ' in / ' + group.cm + ' cm off the ' + joined(group.names) + (group.names.length === 1 ? ' edge' : ' edges');
    }));
  }
  function overhang(desk, rect){
    var l = Math.max(0, -rect.x), t = Math.max(0, -rect.y), r = Math.max(0, rect.x + rect.w - desk.w), b = Math.max(0, rect.y + rect.d - desk.d);
    if (l + t + r + b === 0) return null;
    if (l + r >= rect.w || t + b >= rect.d) return { l: 100, t: 100, r: 0, b: 0 };
    return { l: l / rect.w * 100, r: r / rect.w * 100, t: t / rect.d * 100, b: b / rect.d * 100 };
  }

  function overlap(a, b){ var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), d = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y); return w > 0 && d > 0 ? w*d : 0; }
  function inside(a, b){ return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.d <= b.y + b.d; }

  // every fit rule lives here. setup = { desk, pick, pos }, one(mm) formats a length.
  // returns { cat: { lvl: 0 fits | 1 tight | 2 won't fit, msg, issues: [{ lvl, msg, fix }] } } for pieces in the setup
  function check(setup, one){
    var desk = setup.desk, pick = setup.pick;
    function has(c){ return !!(pick[c] && get(c, pick[c])); }
    function rect(c){ var p = setup.pos[c], s = get(c, pick[c]); return { x: p.x, y: p.y, w: s.w, d: s.d }; }
    var on = cats.filter(has), res = {};
    on.forEach(function(c){ res[c] = []; });
    function add(ids, lvl, msg, fix){ ids.forEach(function(c){ res[c].push({ lvl: lvl, msg: typeof msg === 'string' ? msg : msg[c], fix: fix }); }); }
    on.forEach(function(c){
      var r = rect(c);
      if (r.x < 0 || r.y < 0 || r.x + r.w > desk.w || r.y + r.d > desk.d) {
        var note = hangNote(desk, r);
        if (!note) { add([c], 1, 'touching the edge', 'The ' + labels[c].toLowerCase() + ' is touching the edge. Pull it in a little.'); return; }
        add([c], 2, note, 'The ' + labels[c].toLowerCase() + ' ' + note.charAt(0).toLowerCase() + note.slice(1) + '. Drag it fully on.');
        return;
      }
      var m = Math.min(r.x, desk.w - r.x - r.w, desk.d - r.y - r.d, c === 'monitor' ? Infinity : r.y);
      if (m < 30) {
        var shown = one(m);
        // 1.2 mm is "0 in" and 0.4 mm is "0 cm". Either rounding is the edge, not a distance of zero. It is still tight, so the advice stays.
        var near = !shown || /^0(?:\.0+)?(?:\s|$)/.test(shown) || measureText(m, 'in') === '0' || measureText(m, 'cm') === '0';
        var phrase = near ? 'touching the edge' : shown + ' from the edge';
        add([c], 1, phrase, 'The ' + labels[c].toLowerCase() + ' is ' + phrase + '. Pull it in a little.');
      }
    });
    var padItem = has('pad') && get('pad', pick.pad);
    var kind = padItem && padItem.kind;
    if (has('keyboard') && has('pad') && overlap(rect('keyboard'), rect('pad'))) {
      if (kind === 'glass') add(['keyboard', 'pad'], 2, { keyboard: 'on a glass pad', pad: 'keyboard on the glass' }, "Don't put a keyboard on a glass pad. It can scratch the glass. Move it off, or swap to a cloth desk mat.");
      else if (isMat(padItem)) { if (!inside(rect('keyboard'), rect('pad'))) add(['keyboard', 'pad'], 1, { keyboard: 'partly on the mat', pad: 'keyboard partly on' }, 'The keyboard is partly on the mat, so it can rock. Move it fully on or fully off.'); }
      else add(['keyboard', 'pad'], 2, { keyboard: 'on the mouse pad', pad: 'keyboard on top' }, 'The keyboard is on the mouse pad and eats your mouse room. Move it off, or swap to an extended desk mat.');
    }
    if (has('mouse')) {
      if (has('keyboard') && overlap(rect('mouse'), rect('keyboard'))) add(['mouse', 'keyboard'], 2, { mouse: 'on the keyboard', keyboard: 'mouse on top' }, 'The mouse and keyboard overlap. Give the mouse its own space.');
      else if (has('pad') && !inside(rect('mouse'), rect('pad'))) add(['mouse'], 1, 'off the pad', 'The mouse is off the pad. Drag it back on until the whole mouse is on it.');
    }
    if (has('monitor')) {
      var base = standBox(pick, setup.pos);
      ['keyboard', 'pad', 'mouse'].forEach(function(c){
        if (!has(c) || !standOverlap(base, rect(c))) return;
        if (c === 'pad' && isMat(padItem)) {
          add(['monitor', 'pad'], 1, { monitor: 'stand overlaps the desk mat', pad: 'under the monitor stand' },
            'The monitor stand overlaps the desk mat. Move the mat or stand until their edges are clear.');
          return;
        }
        var msg = { monitor: labels[c].toLowerCase() + ' under the stand' }; msg[c] = 'under the monitor stand';
        var room = desk.d - (base.y + base.d) - 10, what = c === 'pad' ? 'mouse pad' : labels[c].toLowerCase();
        add([c, 'monitor'], 2, msg, rect(c).d > room
          ? 'There isn\'t room in front of the monitor stand for the ' + what + '. A monitor arm or a smaller ' + what + ' would free the space.'
          : 'The ' + what + ' is under the monitor stand. Move it forward.');
      });
    }
    var onMat = isMat(padItem) && has('keyboard') && inside(rect('keyboard'), rect('pad'));
    var out = {};
    on.forEach(function(c){
      var lvl = res[c].reduce(function(a, i){ return Math.max(a, i.lvl); }, 0);
      var top = res[c].filter(function(i){ return i.lvl === lvl; })[0];
      var msg = top ? top.msg : 'fits';
      if (!top && c === 'mouse') msg = 'fits on the desk';
      if (!top && onMat) { if (c === 'pad') msg = has('mouse') ? 'holds keyboard and mouse' : 'holds the keyboard'; if (c === 'keyboard') msg = 'sits on the mat'; }
      out[c] = { lvl: lvl, msg: msg, issues: res[c] };
    });
    return out;
  }

  // share links carry the whole setup, so they work without a server.
  // The link is untrusted. decode returns null (pages then show the default desk and say so)
  // unless every field is the shape encode writes.
  // Desk millimeters live in deskLimits. The s parameter is capped at 4096 characters.
  // Positions are rejected, not clamped. The origin must be a finite number, at most one
  // piece off any edge, and at most 1000mm to the right of the desk. layout() needs that
  // right-hand slack to sit a mouse beside a wide keyboard on a narrow desk; anything
  // further out is dropped with the whole link. A desk that shrank keeps a piece whose
  // top has crossed the new bottom, so the bottom allowance matches the top.
  var short = { monitor: 'm', keyboard: 'k', pad: 'p', mouse: 'o' };
  var shortCat = { m: 'monitor', k: 'keyboard', p: 'pad', o: 'mouse' };
  var SHARE_MAX = 4096;
  var POS_RIGHT = 1000;
  var gripOk = { '': 1, palm: 1, claw: 1, fingertip: 1, unsure: 1 };
  var handOk = { '': 1, small: 1, medium: 1, large: 1, unsure: 1 };
  var useOk = { '': 1, gaming: 1, work: 1, both: 1 };
  function hasOwn(obj, key){ return Object.prototype.hasOwnProperty.call(obj, key); }
  function percentText(part, whole){
    if (!finiteNum(part) || !finiteNum(whole) || whole === 0) return '';
    var n = part / whole * 100;
    if (!isFinite(n)) return '';
    var s = n.toFixed(2);
    if (s === 'NaN' || s === 'Infinity' || s === '-Infinity') return '';
    return s + '%';
  }
  function usedPercent(area, total){
    if (!finiteNum(area) || !finiteNum(total) || total <= 0) return null;
    var n = Math.round(area / total * 100);
    return isFinite(n) ? n : null;
  }
  function encode(setup, a){
    var o = { v: 1, d: [setup.desk.w, setup.desk.d], p: {}, x: {}, a: [a.grip || '', a.hand || '', a.use || ''] };
    cats.forEach(function(c){ if (setup.pick[c]) { o.p[short[c]] = setup.pick[c]; o.x[short[c]] = [setup.pos[c].x, setup.pos[c].y]; } });
    return btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str){
    try {
      if (typeof str !== 'string' || str.length < 1 || str.length > SHARE_MAX) return null;
      if (!/^[A-Za-z0-9_-]+={0,2}$/.test(str)) return null;
      var body = str.replace(/=+$/, '');
      var pad = body.length % 4 === 0 ? '' : '===='.slice(body.length % 4);
      var o = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/') + pad));
      if (!plain(o)) return null;
      var top = Object.keys(o);
      for (var t = 0; t < top.length; t++) {
        if (top[t] !== 'v' && top[t] !== 'd' && top[t] !== 'p' && top[t] !== 'x' && top[t] !== 'a') return null;
      }
      if (o.v !== 1) return null;
      if (!Array.isArray(o.d) || o.d.length !== 2 || !finiteNum(o.d[0]) || !finiteNum(o.d[1])) return null;
      if (!deskAxisOk('w', o.d[0]) || !deskAxisOk('d', o.d[1])) return null;
      if (!plain(o.p) || !plain(o.x)) return null;
      if (!Array.isArray(o.a) || o.a.length !== 3) return null;
      if (!hasOwn(gripOk, o.a[0]) || !hasOwn(handOk, o.a[1]) || !hasOwn(useOk, o.a[2])) return null;
      var pKeys = Object.keys(o.p), xKeys = Object.keys(o.x), seen = {};
      if (pKeys.length !== xKeys.length) return null;
      var setup = { desk: { w: o.d[0], d: o.d[1] }, pick: {}, pos: {} };
      cats.forEach(function(c){ setup.pick[c] = null; });
      for (var i = 0; i < pKeys.length; i++) {
        var key = pKeys[i];
        if (!hasOwn(shortCat, key) || seen[key] || xKeys.indexOf(key) < 0) return null;
        seen[key] = 1;
        var id = o.p[key];
        if (typeof id !== 'string' || !id) return null;
        var item = get(shortCat[key], id);
        if (!item) return null;
        var xy = o.x[key];
        if (!Array.isArray(xy) || xy.length !== 2 || !finiteNum(xy[0]) || !finiteNum(xy[1])) return null;
        if (xy[0] < -item.w || xy[0] > o.d[0] + POS_RIGHT || xy[1] < -item.d || xy[1] > o.d[1] + item.d) return null;
        setup.pick[shortCat[key]] = item.id;
        setup.pos[shortCat[key]] = { x: xy[0], y: xy[1] };
      }
      for (var j = 0; j < xKeys.length; j++) if (!seen[xKeys[j]]) return null;
      return { setup: setup, answers: { grip: o.a[0], hand: o.a[1], use: o.a[2] } };
    } catch (e) { return null; }
  }

  function monitorMeasurements(s, one, two){
    return s.diagonalIn + "″ diagonal · " + one(s.dims.w) + " wide · " + one(s.d) + " deep with stand\nStand span (W × D): " + two(s.base[0], s.base[1]) + "\nTop view shows the stock stand at neutral tilt. Outline and panel position are approximate.";
  }

  async function copySetupLink(button, url){
    const original = button.dataset.copyLabel || button.textContent;
    button.dataset.copyLabel = original;
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = 'Link copied';
      clearTimeout(button.copyTimer);
      button.copyTimer = setTimeout(function(){ button.textContent = original; }, 1800);
    } catch {
      window.prompt('Copy this setup link:', url);
    }
  }

  window.SV = { measurementInfo: measurementInfo, markPadContact: markPadContact, drawMonitor: drawMonitor, copySetupLink: copySetupLink, invalidShareNotice: "This link couldn’t be read. You’re seeing an example desk.",  monitorMeasurements: monitorMeasurements, catalog: catalog, cats: cats, labels: labels, padLabels: padLabels, preferences: preferences, get padTry(){ return activePads(); }, idAlias: idAlias, get: get, forSale: forSale, isMat: isMat, amazonLink: amazonLink, cartLink: cartLink, buyLine: buyLine, answers: answers, answerText: answerText, mouseSlot: mouseSlot,
    recommend: recommend, omission: omission, matchReason: matchReason, place: place, layout: layout, settle: settle, retarget: retarget, previewSetup: previewSetup, overhang: overhang, overlap: overlap, check: check, encode: encode, decode: decode, usedArea: usedArea,
    deskLimits: deskLimits, defaultDesk: defaultDesk, deskFallbackNotice: deskFallbackNotice,
    parseDeskInput: parseDeskInput, deskMm: deskMm, deskAxisOk: deskAxisOk, deskOk: deskOk, deskField: deskField, savedDesk: savedDesk,
    deskRangeMessage: deskRangeMessage, measureText: measureText, percentText: percentText, usedPercent: usedPercent };
})();
