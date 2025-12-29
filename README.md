# Universal Cloudflare Bypass Tool v2

A Node.js-based tool for bypassing Cloudflare protection with full support for Single Page Applications (React, Vue, Angular). Built with Puppeteer and advanced stealth techniques.

## ⚠️ Legal Disclaimer

This tool is provided for **research, testing, and educational purposes only**. Using this tool to bypass security measures without explicit permission may violate Terms of Service agreements and applicable laws. Users are solely responsible for ensuring their use complies with all relevant legal requirements.

---

## Features

- Automatic Cloudflare challenge detection and bypass
- Full support for SPA frameworks (React, Vue, Angular)
- Advanced browser fingerprint evasion
- Multi-format content extraction (HTML, JSON, plain text)
- Intelligent waiting strategies (network idle, DOM ready state)
- Screenshot capture capability
- Cookie extraction and persistence
- Resource blocking for improved performance

---

## Requirements

- Node.js >= 14.x
- npm or yarn

---

## Installation

```bash
# Install dependencies
npm install puppeteer

# Or using yarn
yarn add puppeteer
```

---

## Usage

### Basic Syntax

```bash
node bypasscf.js <url> [options]
```

### Common Examples

**Simple bypass:**

```bash
node bypasscf.js https://example.com/
```

**Bypass with HTML output:**

```bash
node bypasscf.js https://www.hexel-cloud.cfd/ --save-html
```

**API endpoint bypass:**

```bash
node bypasscf.js https://api.example.com/data.json --save-json
```

**SPA website (wait for network idle):**

```bash
node bypasscf.js https://react-app.com/ --wait-network --save-html
```

**Visual debugging mode:**

```bash
node bypasscf.js https://example.com/ --no-headless --screenshot
```

**Custom timeout and wait time:**

```bash
node bypasscf.js https://slow-site.com/ --timeout 90000 --wait-time 10000
```

---

## Command Line Options

| Option             | Description                                 | Default |
| ------------------ | ------------------------------------------- | ------- |
| `--save-html`      | Save complete HTML output to file           | false   |
| `--save-json`      | Save JSON data to file                      | false   |
| `--wait-network`   | Wait for network idle (recommended for SPA) | false   |
| `--wait-dom`       | Wait for DOM ready state                    | false   |
| `--wait-time <ms>` | Additional wait time after page load        | 5000    |
| `--screenshot`     | Capture screenshot after render             | false   |
| `--no-headless`    | Show browser window (debugging)             | false   |
| `--timeout <ms>`   | Maximum timeout for operations              | 60000   |

---

## Output Files

The tool generates multiple output files with timestamped names:

### 1. Details File (Always Created)

**Format:** `cf-details-<hostname>-<timestamp>.json`

Contains complete extraction results:

```json
{
  "success": true,
  "url": "https://example.com/",
  "finalUrl": "https://example.com/",
  "content": {
    "title": "Example Page",
    "fullHTML": "...",
    "bodyText": "...",
    "spaContent": "...",
    "hasReact": true,
    "scripts": [...],
    "metaTags": [...]
  },
  "cookies": [...],
  "timestamp": "2025-12-29T10:30:58.000Z"
}
```

### 2. Summary File (Always Created)

**Format:** `cf-summary-<hostname>-<timestamp>.json`

Contains high-level statistics:

```json
{
  "url": "https://example.com/",
  "finalUrl": "https://example.com/",
  "timestamp": "2025-12-29T10:30:58.000Z",
  "success": true,
  "title": "Example Page",
  "contentLength": 45678,
  "textLength": 12345,
  "hasReact": true,
  "hasVue": false,
  "hasAngular": false,
  "cookies": 3
}
```

### 3. HTML File (Optional: `--save-html`)

**Format:** `cf-fullpage-<hostname>-<timestamp>.html`

Full rendered HTML including dynamically loaded content.

### 4. Text Content (Always Created)

**Format:** `cf-text-<hostname>-<timestamp>.txt`

Extracted plain text content from the page.

### 5. API Data (Auto-detected)

**Format:** `cf-api-<hostname>-<timestamp>.json`

JSON data from API endpoints (auto-detected for `/api/`, `/wp-json/`, `.json` URLs).

### 6. Screenshot (Optional: `--screenshot`)

**Format:** `screenshot-<timestamp>.png`

Full-page screenshot after rendering.

---

## How It Works

### 1. Browser Initialization

- Launches headless Chromium with stealth arguments
- Configures viewport and user agent
- Applies anti-detection techniques
- Enables request interception for resource blocking

### 2. Cloudflare Detection

Monitors for common Cloudflare indicators:

- "Checking your browser" text
- "Just a moment" page title
- Cloudflare challenge elements

### 3. Challenge Solving

- Waits for automatic challenge resolution (up to 30 seconds)
- Clicks interactive checkboxes if present
- Monitors page transitions

### 4. SPA Loading Strategy

- Waits for framework-specific indicators (React/Vue/Angular)
- Optional network idle waiting
- DOM ready state verification
- Configurable additional wait time

### 5. Content Extraction

Multiple extraction methods:

- Full HTML from `document.documentElement.outerHTML`
- Body HTML from `document.body.innerHTML`
- Plain text from `document.body.innerText`
- SPA content from main containers (`#app`, `#root`, etc.)
- Framework detection (React, Vue, Angular)
- Meta tag extraction
- Script source analysis

---

## Advanced Usage

### Batch Processing

Create a bash script for multiple URLs:

```bash
#!/bin/bash
# batch-bypass.sh

urls=(
  "https://site1.com"
  "https://site2.com"
  "https://site3.com"
)

for url in "${urls[@]}"; do
  echo "Processing: $url"
  node bypasscf.js "$url" --save-html --wait-network
  sleep 5
done
```

### API Integration

Example Node.js integration:

```javascript
const { spawn } = require("child_process");

function bypassCloudflare(url) {
  return new Promise((resolve, reject) => {
    const process = spawn("node", ["bypasscf.js", url, "--save-json"]);

    process.on("close", (code) => {
      if (code === 0) {
        // Read the generated JSON file
        resolve("Success");
      } else {
        reject(new Error("Bypass failed"));
      }
    });
  });
}
```

### Programmatic Usage

Modify the script to export the class:

```javascript
// At the end of bypasscf.js
module.exports = UniversalCFBypass;

// In your script
const UniversalCFBypass = require("./bypasscf");

(async () => {
  const bypass = new UniversalCFBypass({
    headless: true,
    timeout: 60000,
  });

  const result = await bypass.navigateAndExtract("https://example.com/");
  console.log(result);

  await bypass.close();
})();
```

---

## Troubleshooting

### Issue: Stuck on "Checking your browser"

**Possible causes:**

- Challenge requires manual interaction (CAPTCHA)
- IP address is rate-limited or blocked
- Browser fingerprint detected

**Solutions:**

```bash
# Increase timeout
node bypasscf.js <url> --timeout 120000

# Use visual mode to debug
node bypasscf.js <url> --no-headless

# Try with network waiting
node bypasscf.js <url> --wait-network --wait-time 10000
```

### Issue: Incomplete content on SPA websites

**Solution:**

```bash
# Use network idle waiting
node bypasscf.js <url> --wait-network

# Or increase wait time
node bypasscf.js <url> --wait-time 10000

# Or both
node bypasscf.js <url> --wait-network --wait-time 8000
```

### Issue: Puppeteer installation fails

**Linux:**

```bash
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libc6 libcairo2 \
  libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 \
  libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
  libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
  libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
  libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
  libxtst6 fonts-liberation libappindicator1 libnss3 lsb-release \
  xdg-utils wget
```

**Windows:**

```bash
# Use Git Bash or WSL
npm install puppeteer --no-save
```

### Issue: "Protocol error" or connection refused

**Solution:**

```bash
# Clear Puppeteer cache
rm -rf ~/.cache/puppeteer

# Reinstall
npm install puppeteer
```

---

## Performance Optimization

### Resource Blocking

The tool automatically blocks these resources to improve speed:

- Images
- Fonts
- Stylesheets
- Media files

To disable resource blocking, comment out this section in the code:

```javascript
// In the init() method
// await this.page.setRequestInterception(true);
// this.page.on('request', (req) => {
//   const resourceType = req.resourceType();
//   if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
//     req.abort();
//   } else {
//     req.continue();
//   }
// });
```

### Optimal Settings for Different Use Cases

**Fast scraping (text only):**

```bash
node bypasscf.js <url> --wait-time 2000
```

**API endpoints:**

```bash
node bypasscf.js <url> --save-json --wait-time 3000
```

**Complex SPA:**

```bash
node bypasscf.js <url> --wait-network --wait-dom --wait-time 8000 --save-html
```

**Complete extraction:**

```bash
node bypasscf.js <url> --wait-network --save-html --screenshot --timeout 90000
```

---

## Limitations

1. **CAPTCHA Challenges**: Cannot solve complex CAPTCHAs (reCAPTCHA v3, hCaptcha)
2. **Rate Limiting**: Excessive requests may trigger IP blocks
3. **Fingerprinting**: Advanced bot detection may still identify automation
4. **Dynamic Content**: Some heavily obfuscated content may not extract properly
5. **Authentication**: Does not handle login forms or OAuth flows

---

## Best Practices

1. **Respect Rate Limits**: Add delays between requests
2. **Use Proxies**: Rotate IPs for large-scale operations
3. **Check robots.txt**: Respect website crawling policies
4. **Monitor Performance**: Use `--no-headless` for debugging
5. **Handle Failures**: Implement retry logic with exponential backoff
6. **Legal Compliance**: Always verify you have permission to scrape

---

## Technical Details

### Stealth Techniques

```javascript
// Navigator.webdriver hiding
Object.defineProperty(navigator, "webdriver", { get: () => false });

// Plugin spoofing
Object.defineProperty(navigator, "plugins", {
  get: () => [1, 2, 3, 4, 5],
});

// Permission overrides
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) =>
  parameters.name === "notifications"
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters);
```

### Browser Arguments

```javascript
[
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--window-size=1920,1080",
  "--disable-blink-features=AutomationControlled",
];
```

---

## Contributing

Contributions are welcome. Please ensure:

- Code follows existing style
- All features are documented
- Testing is performed before submission
- Legal and ethical guidelines are followed

---

## License

This tool is provided as-is for educational purposes. Users assume all responsibility for their usage.

---

## Support

For issues, questions, or feature requests, please open an issue in the repository with:

- Node.js version
- Operating system
- Complete error message
- URL being tested (if public)
- Command used

---

<footer align="center">

Created by **[PteroxOS](https://github.com/PteroxOS)**

</footer>
