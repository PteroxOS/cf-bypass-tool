#!/usr/bin/env node

console.log("[*] Universal Cloudflare Bypass Tool v2");
console.log("[*] Supports: Checkbox + API + SPA Websites\n");

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Parse arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: node cf-bypass.js <url> [options]");
    console.error("\nExamples:");
    console.error("  node cf-bypass.js https://www.hexel-cloud.cfd/ --wait-network");
    console.error("  node cf-bypass.js https://v1.samehadaku.how/wp-json/eastheme/search/?keyword=boku");
    console.error("  node cf-bypass.js https://any-site.com/ --wait-dom --timeout 30000");
    console.error("\nOptions:");
    console.error("  --save-html           Save final HTML");
    console.error("  --save-json           Save JSON data");
    console.error("  --wait-network        Wait for network idle (for SPA)");
    console.error("  --wait-dom            Wait for DOM ready state");
    console.error("  --wait-time <MS>      Additional wait after load (default: 5000)");
    console.error("  --screenshot          Take screenshot");
    console.error("  --no-headless         Show browser window");
    console.error("  --method <METHOD>     HTTP method");
    console.error("  --timeout <MS>        Total timeout");
    process.exit(1);
}

const targetUrl = args[0];
const options = parseOptions(args.slice(1));

class UniversalCFBypass {
    constructor(config = {}) {
        this.config = {
            headless: config.headless !== false,
            stealth: true,
            timeout: config.timeout || 60000,
            waitAfterLoad: config.waitAfterLoad || 5000,
            waitForNetwork: config.waitForNetwork || false,
            waitForDOM: config.waitForDOM || false,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ]
        };
        
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log(`[*] Initializing browser...`);
        
        const launchOpts = {
            headless: this.config.headless,
            args: this.config.args
        };

        this.browser = await puppeteer.launch(launchOpts);
        this.page = await this.browser.newPage();
        
        await this.page.setViewport(this.config.viewport);
        await this.page.setUserAgent(this.config.userAgent);
        
        await this.applyStealth();
        
        // Enable request interception to block unnecessary resources
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            // Block images, fonts, styles, media to speed up
            const resourceType = req.resourceType();
            if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        console.log('[+] Browser initialized');
        return this;
    }

    async applyStealth() {
        await this.page.evaluateOnNewDocument(() => {
            // Hide webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Spoof plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
        });
    }

    async solveCloudflare() {
        console.log('[*] Checking for Cloudflare...');
        
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max
        
        while (attempts < maxAttempts) {
            const content = await this.page.content();
            const title = await this.page.title().catch(() => '');
            
            // Check for Cloudflare challenge
            if (content.includes('Checking your browser') || 
                content.includes('Just a moment') ||
                title.includes('Just a moment')) {
                
                console.log(`[*] Cloudflare detected (attempt ${attempts + 1})`);
                
                // Check for checkbox
                const hasCheckbox = await this.page.evaluate(() => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                    return checkboxes.length > 0;
                });
                
                if (hasCheckbox) {
                    console.log('[*] Clicking checkbox...');
                    await this.page.click('input[type="checkbox"]');
                }
                
                await this.delay(1000);
                attempts++;
                
            } else {
                // No Cloudflare detected
                console.log('[+] Cloudflare bypassed or not present');
                return true;
            }
        }
        
        console.log('[-] Cloudflare timeout');
        return false;
    }

    async waitForSPA() {
        console.log('[*] Waiting for SPA to load...');
        
        // Wait for React/Angular/Vue to render
        await this.page.waitForFunction(() => {
            // Check if React app is loaded
            if (window.React || window.angular || window.Vue) {
                return document.querySelector('#app, [data-reactroot], .app-container')?.innerHTML?.length > 100;
            }
            
            // Or wait for content to appear
            const bodyText = document.body.innerText || '';
            return bodyText.length > 100 && !bodyText.includes('Loading');
        }, { timeout: this.config.timeout }).catch(() => {
            console.log('[-] SPA wait timeout, continuing...');
        });
        
        // Additional wait for network requests
        if (this.config.waitForNetwork) {
            console.log('[*] Waiting for network idle...');
            await this.page.waitForNetworkIdle({ idleTime: 1000, timeout: 10000 })
                .catch(() => console.log('[-] Network idle timeout'));
        }
        
        // Wait for DOM to be ready
        if (this.config.waitForDOM) {
            await this.page.waitForFunction(() => {
                return document.readyState === 'complete';
            }, { timeout: 10000 });
        }
        
        // Final wait
        await this.delay(this.config.waitAfterLoad);
        console.log('[+] Page should be fully loaded');
    }

    async getRenderedContent() {
        console.log('[*] Getting fully rendered content...');
        
        // Execute JavaScript to get real content
        const renderedContent = await this.page.evaluate(() => {
            // Try to get React/Vue/Angular content
            const getSPAContent = () => {
                // Method 1: Check for virtual DOM
                if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    const roots = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.roots;
                    if (roots && roots.size > 0) {
                        return 'React app detected';
                    }
                }
                
                // Method 2: Get text content
                const bodyText = document.body.innerText || document.body.textContent || '';
                if (bodyText.length > 100) {
                    return bodyText.substring(0, 5000);
                }
                
                // Method 3: Get HTML of main container
                const mainContainers = ['#app', '#root', '.app', '.application', 'main', '[role="main"]'];
                for (const selector of mainContainers) {
                    const el = document.querySelector(selector);
                    if (el && el.innerHTML.length > 100) {
                        return el.innerHTML;
                    }
                }
                
                // Method 4: Get all text nodes
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let text = '';
                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent.trim().length > 0) {
                        text += node.textContent + '\n';
                    }
                }
                
                return text || document.documentElement.outerHTML;
            };
            
            return {
                url: window.location.href,
                title: document.title,
                fullHTML: document.documentElement.outerHTML,
                bodyHTML: document.body.innerHTML,
                bodyText: document.body.innerText || document.body.textContent || '',
                spaContent: getSPAContent(),
                metaTags: Array.from(document.querySelectorAll('meta')).map(m => ({
                    name: m.getAttribute('name') || m.getAttribute('property'),
                    content: m.getAttribute('content')
                })).filter(m => m.name && m.content),
                scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src),
                hasReact: !!window.React,
                hasVue: !!window.Vue,
                hasAngular: !!window.angular,
                windowVars: Object.keys(window).filter(k => 
                    k.includes('app') || k.includes('App') || k.includes('APP') ||
                    k.includes('data') || k.includes('Data') || k.includes('user')
                )
            };
        });
        
        return renderedContent;
    }

    async navigateAndExtract(url, method = 'GET') {
        console.log(`\n[*] Target: ${url}`);
        console.log(`[*] Method: ${method}`);
        
        if (!this.browser) await this.init();
        
        try {
            // Navigate
            const waitUntil = this.config.waitForNetwork ? 'networkidle2' : 'domcontentloaded';
            
            console.log('[*] Navigating...');
            await this.page.goto(url, {
                waitUntil: waitUntil,
                timeout: this.config.timeout
            });
            
            // Solve Cloudflare if present
            await this.solveCloudflare();
            
            // Wait for SPA to load (if needed)
            await this.waitForSPA();
            
            // Take screenshot if requested
            if (options.screenshot) {
                await this.page.screenshot({ 
                    path: `screenshot-${Date.now()}.png`,
                    fullPage: true 
                });
                console.log('[+] Screenshot saved');
            }
            
            // Get fully rendered content
            const content = await this.getRenderedContent();
            
            // Check if this is JSON API response
            if (url.includes('.json') || url.includes('/api/') || url.includes('/wp-json/')) {
                try {
                    const jsonData = await this.page.evaluate(() => {
                        try {
                            return JSON.parse(document.body.textContent);
                        } catch (e) {
                            return null;
                        }
                    });
                    
                    if (jsonData) {
                        content.apiData = jsonData;
                        content.contentType = 'json';
                    }
                } catch (e) {
                    // Not JSON
                }
            }
            
            return {
                success: true,
                url: url,
                finalUrl: this.page.url(),
                content: content,
                cookies: await this.page.cookies(),
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[-] Error:', error.message);
            return {
                success: false,
                error: error.message,
                url: url
            };
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('[+] Browser closed');
        }
    }
}

function parseOptions(args) {
    const options = {
        saveHtml: false,
        saveJson: false,
        screenshot: false,
        waitForNetwork: false,
        waitForDOM: false,
        waitAfterLoad: 5000,
        timeout: 60000
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--save-html':
                options.saveHtml = true;
                break;
            case '--save-json':
                options.saveJson = true;
                break;
            case '--screenshot':
                options.screenshot = true;
                break;
            case '--wait-network':
                options.waitForNetwork = true;
                break;
            case '--wait-dom':
                options.waitForDOM = true;
                break;
            case '--wait-time':
                options.waitAfterLoad = parseInt(args[++i]) || 5000;
                break;
            case '--no-headless':
                options.headless = false;
                break;
            case '--timeout':
                options.timeout = parseInt(args[++i]) || 60000;
                break;
        }
    }
    
    return options;
}

async function saveResults(result, options) {
    if (!result.success) return;
    
    const url = new URL(result.url);
    const hostname = url.hostname.replace(/[^a-z0-9]/gi, '_');
    const timestamp = Date.now();
    
    // Save detailed content
    const detailsFile = `cf-details-${hostname}-${timestamp}.json`;
    fs.writeFileSync(detailsFile, JSON.stringify(result, null, 2));
    console.log(`[+] Details saved to: ${detailsFile}`);
    
    // Save HTML if requested and available
    if (options.saveHtml && result.content?.fullHTML) {
        const htmlFile = `cf-fullpage-${hostname}-${timestamp}.html`;
        fs.writeFileSync(htmlFile, result.content.fullHTML);
        console.log(`[+] Full HTML saved to: ${htmlFile}`);
    }
    
    // Save extracted text
    const textFile = `cf-text-${hostname}-${timestamp}.txt`;
    const textContent = result.content?.bodyText || result.content?.spaContent || '';
    fs.writeFileSync(textFile, textContent);
    console.log(`[+] Text content saved to: ${textFile}`);
    
    // Save API data if present
    if (result.content?.apiData) {
        const apiFile = `cf-api-${hostname}-${timestamp}.json`;
        fs.writeFileSync(apiFile, JSON.stringify(result.content.apiData, null, 2));
        console.log(`[+] API data saved to: ${apiFile}`);
    }
    
    // Save summary
    const summary = {
        url: result.url,
        finalUrl: result.finalUrl,
        timestamp: result.timestamp,
        success: result.success,
        title: result.content?.title || '',
        contentLength: result.content?.fullHTML?.length || 0,
        textLength: textContent.length,
        hasReact: result.content?.hasReact || false,
        hasVue: result.content?.hasVue || false,
        hasAngular: result.content?.hasAngular || false,
        cookies: result.cookies?.length || 0
    };
    
    const summaryFile = `cf-summary-${hostname}-${timestamp}.json`;
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`[+] Summary saved to: ${summaryFile}`);
    
    // Display content preview
    console.log('\n📄 CONTENT PREVIEW:');
    console.log('='.repeat(70));
    if (result.content?.title) {
        console.log(`Title: ${result.content.title}`);
    }
    
    if (result.content?.bodyText) {
        const preview = result.content.bodyText.substring(0, 500).replace(/\n/g, ' ');
        console.log(`Text: ${preview}...`);
    }
    
    if (result.content?.apiData) {
        console.log(`API Data: ${Object.keys(result.content.apiData).length} keys`);
        console.log(JSON.stringify(result.content.apiData, null, 2).split('\n').slice(0, 10).join('\n') + '...');
    }
}

async function main() {
    console.log(`\n${'='.repeat(70)}`);
    console.log('UNIVERSAL CLOUDFLARE BYPASS - SPA SUPPORT');
    console.log('='.repeat(70));
    
    const bypass = new UniversalCFBypass({
        headless: options.headless !== false,
        timeout: options.timeout,
        waitAfterLoad: options.waitAfterLoad,
        waitForNetwork: options.waitForNetwork,
        waitForDOM: options.waitForDOM
    });
    
    try {
        const result = await bypass.navigateAndExtract(targetUrl);
        
        console.log(`\n${'='.repeat(70)}`);
        console.log('FINAL RESULTS');
        console.log('='.repeat(70));
        
        if (result.success) {
            console.log(`✅ SUCCESS!`);
            console.log(`📌 Original URL: ${result.url}`);
            console.log(`📍 Final URL: ${result.finalUrl}`);
            console.log(`📝 Title: ${result.content?.title || 'N/A'}`);
            console.log(`📊 Content size: ${result.content?.fullHTML?.length || 0} bytes`);
            console.log(`📖 Text length: ${result.content?.bodyText?.length || 0} chars`);
            console.log(`⚛️  React: ${result.content?.hasReact ? 'Yes' : 'No'}`);
            console.log(`🍪 Cookies: ${result.cookies?.length || 0}`);
            
            saveResults(result, options);
            
        } else {
            console.log(`❌ FAILED: ${result.error}`);
        }
        
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
    } finally {
        await bypass.close();
        console.log('\n[+] Done\n');
    }
}

// Run
main().catch(console.error);