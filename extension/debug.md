# 🐛 Debug Guide: Floating Icon Not Appearing

## Quick Checks:

### 1. **Is the extension loaded?**
- Go to `chrome://extensions/`
- Look for "Floating Icon Extension"
- Make sure the toggle is **ON** (blue)

### 2. **Check the console for errors:**
- Visit any website (e.g., google.com)
- Right-click → "Inspect" → "Console" tab
- Look for any red error messages

### 3. **Force refresh the page:**
- Press `Ctrl+F5` (or `Cmd+Shift+R` on Mac) to hard refresh
- The floating icon should appear in bottom-right corner

### 4. **Check content script injection:**
- In the Console tab, type: `document.getElementById('floating-extension-icon')`
- If it returns `null`, the content script isn't running

### 5. **Check extension permissions:**
- Go to `chrome://extensions/`
- Click "Details" on your extension
- Make sure "Allow access to file URLs" is enabled if testing local files

## Common Issues:

### ❌ **Content Script Not Loading**
- **Cause**: Permission issues or manifest errors
- **Fix**: Check console for errors, reload extension

### ❌ **CSS Not Applied**
- **Cause**: Tailwind CSS not loading
- **Fix**: Check if CSS files exist in dist/assets/

### ❌ **React Components Not Rendering**
- **Cause**: JavaScript errors or missing dependencies
- **Fix**: Check browser console for errors

## Force Debug Mode:

Add this to any website's console to manually create the icon:

```javascript
// Manual debug - paste in browser console
const container = document.createElement('div');
container.id = 'debug-floating-icon';
container.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background: blue;
  border-radius: 50%;
  z-index: 999999;
  cursor: pointer;
`;
container.textContent = '🔄';
container.style.display = 'flex';
container.style.alignItems = 'center';
container.style.justifyContent = 'center';
container.style.fontSize = '24px';
document.body.appendChild(container);
console.log('Debug icon created!');
```

If this debug icon appears, the issue is with the extension. If it doesn't, there might be a page-specific issue. 