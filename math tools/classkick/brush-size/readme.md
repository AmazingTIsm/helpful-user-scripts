Classkick Brush Size Memory v2

INSTALL
1 Copy Contents from userscript aka (https://github.com/AmazingTIsm/helpful-user-scripts/blob/main/math%20tools/classkick/brush-size/userscript.js"
2. Open Tampermonkey -> Dashboard -> Utilities -> Import from file (or create a new script and paste its contents).
3. Enable the script and refresh https://app.classkick.com/.
4. Change a pen/highlighter/eraser brush size, switch tools, and reload to test.

PERSISTENCE
Uses Tampermonkey's GM_getValue / GM_setValue storage, independent of Classkick's login session and ordinary site localStorage. It persists in the same browser profile while Tampermonkey retains its data. It does not automatically sync between devices.

COMPATIBILITY NOTE
The supplied 393 KB text contains React 19.2.0 and general React DOM/scheduler utilities, but no Classkick-specific brush-control names or handlers. This script targets accessible and standard input controls, which may not cover Classkick's custom controls. It has not been live-tested on a Classkick drawing page. If sizes do not restore, provide the brush menu's HTML from Inspect Element for a precise selector-based fix.
