# Troubleshooting: Changes Not Visible

If you can't see the changes we made, try these steps:

## 1. Hard Refresh Browser Cache

The browser may be caching the old version. Try:

- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

Or:
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## 2. Check Browser Console

Open Developer Tools (F12) and check the Console tab for:
- Any JavaScript errors (red messages)
- Look for these log messages:
  - "Populating hour dropdown on page load..."
  - "Hour dropdown populated with X hours"
  - "Form submitted, starting validation..."
  - "Validation failed with X errors"

If you see errors, they will tell us what's wrong.

## 3. Verify File is Updated

Check that `booking.html` has these features:

### Hour Dropdown
- Should populate immediately when page loads
- Should show hours 09-19
- Check browser console for "Populating hour dropdown on page load..."

### Error Messages
- Should appear above "Confirm Booking" button
- Should show red box with list of errors
- Fields with errors should have red borders

### Red Highlighting
- Empty required fields should have:
  - Red border (2px)
  - Light red background
- Page should scroll to first error field

## 4. Test the Features

### Test Hour Dropdown:
1. Open `booking.html` in browser
2. Check if hour dropdown has options (09-19)
3. If empty, check browser console for errors

### Test Validation:
1. Leave all fields empty
2. Click "Confirm Booking"
3. Should see:
   - Red error box above button
   - All empty fields highlighted in red
   - Page scrolls to first error field

## 5. Check File Location

Make sure you're opening the correct file:
- File path: `/Users/meghana/treasure-hunt-game/booking.html`
- If using a local server, make sure it's serving the updated file

## 6. Verify Git Status

Run:
```bash
git status
git log --oneline -3
```

Should see commits:
- "Fix hour dropdown to always load on page load..."
- "Add red highlighting and scroll-to-field..."

## 7. If Still Not Working

1. Check browser console for JavaScript errors
2. Share the error messages
3. Try opening the file directly (file:// protocol) instead of through a server
4. Check if other JavaScript on the page is working

## Quick Test

Open browser console and run:
```javascript
// Check if hour dropdown exists and has options
const hourSelect = document.getElementById('time-hour');
console.log('Hour select found:', !!hourSelect);
console.log('Hour options:', hourSelect ? hourSelect.options.length : 'N/A');

// Check if form-errors div exists
const formErrors = document.getElementById('form-errors');
console.log('Form errors div found:', !!formErrors);
```

If these return `false` or `0`, there's an issue with the HTML structure.

## Live domain (letterleftbehind.com)

If booking or payments fail only on the public site, see **`DOMAIN-SETUP.md`** (Stripe API URL, `CLIENT_ORIGIN` / CORS, Firebase authorized domains).
