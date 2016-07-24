// @changes          0.29.0 - Added option to edit keyboard binds
//                     - Now you can edit keys in options
//                   1 - Added Contributors tab, bug fixes
//                   0.28.0 - Revamped UI
//                     - Stats now detects viruses being eaten
//                   1 - Updated @updateURL and @downloadURL to not use rawgit
//                   2 - Upgraded zoom functions
//                   3 - Some zoom bug fixes
//                   4 - protocol breakage fix
//                   5 - fixed my fuckup
//              0.27.0 - Click-to-lock added
//                     - Added ability to lock blob at some pos
//                     - Added ability to select n-th size blob
//                   2 - Fixed virus shot counter, improved shots remaining calculation
//                     - General code cleanup
//                     - shots per ms field added
//                     - options screen cleanup/reorg
//                   6 - Hack to get mod loading again.
//                   7 - proper fix for xp bar rename
//                   8 - added isAgitated
//                     - changed multiblob grazer var name to reset multiblob default to 'false'
//              0.26.0 - Configurable Minimap scale & Agariomod private server location update
//              0.25.0 - Facebook Update
//                   1 - Tons of bug fixes
//              0.24.0 - Switched back to hacky method of loading & added hotkey reference
//                   1 - Guest play fix
//                   2 - UI Tweaks and a new message
//              0.23.0 - Agariomods.com private server support
//              0.22.0 - Added hybrid grazer option & fixed music
//                   1 - music restored, viruses excluded from relocated names
//                     - Hybrid grazer goes back to old grazer if it loses enough mass
//                   2 - Hybrid grazer checkbox fix
//                   3 - volume fix
//                   4 - Blank cell fix
//                     - Option to remove grid lines
//                     - Oldest cell now just displays name rather than negative Time To Remerge (TTR)
//                   5 - Grazer auto-respawn
//                   6 - G and H act equivalently in hybrid-grazer mode
//                     - if old grazer has no targets it will try to switch into new grazer mode
//              0.21.0 - Changed way script is loaded.
//              0.20.0 - Version leap due to updated grazer
//                     - Fixes for new client behavior
//              0.15.0 - Fixed Minimap (Zeach broke it)
//                     - Fixed Borders(Zeach broke them too)
//                     - Lite Brite mode added (and some UI issues fixed)
//                   2 - Lite Brite, SFX, and BGM settings all saved
//                   3 - hack for overflowing chart & updated hardcoded agariomods skins
//              0.14.0 - Major refactoring to help with future updates
//                     - Support for AgarioMods connect skins
//              0.13.0 - Fixed break caused by recent code changes
//                   1 - bug fixes
//                     - removed direct connect UI (for now)
//                   2 - grazer speed improved by removing debug logging & adding artifical 200ms throttle
//                   3 - fixed virus poppers
//                     - fixed ttr calculation
//                   6 - fixed flickering grazer lines
//              0.12.0 - Added music and sound effects.
//                     - Sound effects from agariomods.com
//                     - Music from http://incompetech.com/music/royalty-free/most/kerbalspaceprogram.php
//                     - Fix: scroll wheel function
//                     - Fixed blank cell not displaying % diff issue
//                     - Fixed key bindings triggering while changing name
//                   4 - bug fix courtesy of Gjum
//                   5 - updated handshake for v548
//              0.11.0 - Fix for v538 fix
//                   1 - grazer fixed, time alive and ttr fixed
//                   2 - more fixes for stuff I missed
//                   3 - onDestroy bugfix
//                   4 - update with mikeyk730's latest changes
//                   5 - skins should now display in experimental
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.0/lodash.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest

// ==/UserScript==
var _version_ = GM_info.script.version;


//if (window.top != window.self)  //-- Don't run on frames or iframes
//    return;
//https://cdn.rawgit.com/pockata/blackbird-js/1e4c9812f8e6266bf71a25e91cb12a553e7756f4/blackbird.js
//https://raw.githubusercontent.com/pockata/blackbird-js/cc2dc268b89e6345fa99ca6109ddaa6c22143ad0/blackbird.css
$.getScript("https://cdnjs.cloudflare.com/ajax/libs/canvasjs/1.4.1/canvas.min.js");
$.getScript("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js");

unsafeWindow.connect2 = unsafeWindow.connect;
jQuery("#canvas").remove();
jQuery("#connecting").after('<canvas id="canvas" width="800" height="600"></canvas>');

(function(d, f) {


    // Options that will always be reset on reload
    var zoomFactor = 10;
    var isGrazing = false;
    var serverIP = "";
    var showVisualCues = true;

    // Game State & Info
    var highScore = 0;
    var timeSpawned = null;
    var grazzerTargetResetRequest = false;
    var nearestVirusID;
    var suspendMouseUpdates = false;
    var grazingTargetFixation = false;
    var selectedBlobID = null;

    // Constants
    var Huge = 2.66,
        Large = 1.25,
        Small = 0.7,
        Tiny = 0.375;
    var Huge_Color = "#FF3C3C",
        Large_Color = "#FFBF3D",
        Same_Color = "#FFFF00",
        Small_Color  = "#00AA00",
        Tiny_Color = "#CC66FF",
        myColor ="#3371FF",
        virusColor ="#666666";
    var lastMouseCoords = { x: 0, y: 0 };
    var ghostBlobs = [];


    var miniMapCtx=jQuery('<canvas id="mini-map" width="175" height="175" style="border:2px solid #999;text-align:center;position:fixed;bottom:5px;right:5px;"></canvas>')
        .appendTo(jQuery('body'))
        .get(0)
        .getContext("2d");

    // cobbler is the object that holds all user options. Options that should never be persisted can be defined here.
    // If an option setting should be remembered it can
    var cobbler = {
        set grazingMode(val)    {isGrazing = val;},
        get grazingMode()       {return isGrazing;},
        _isAcid : false,
        set isAcid(val)         {this._isAcid = val; setAcid(val);},
        get isAcid()            {return this._isAcid;},
        minimapScaleCurrentValue : 1,
        "displayMiniMap" : true,

    };
    // utility function to simplify creation of options whose state should be persisted to disk
    function simpleSavedSettings(optionsObject){
        _.forEach(optionsObject, function(defaultValue, settingName){
            var backingVar = '_' + settingName;
            cobbler[backingVar] = GM_getValue(settingName, defaultValue);
            Object.defineProperty(cobbler, settingName, {
                get: function()     { return this[backingVar];},
                set: function(val)  { this[backingVar] = val; GM_setValue(settingName, val); }
            });
        });
    }
    // defines all options that should be persisted along with their default values.
    function makeCobbler(){
        var optionsAndDefaults = {
            "isLiteBrite"       : true,
            "sfxVol"            : 0.5,
            "bgmVol"            : 0.5,
            "drawTail"          : false,
            "splitGuide"        : true,
            "rainbowPellets"    : true,
            "debugLevel"        : 1,
            "imgurSkins"        : true,
            "amExtendedSkins"   : true,
            "amConnectSkins"    : true,
            "namesUnderBlobs"   : false,
            "grazerMultiBlob2"  : false,
            "grazerHybridSwitch": false,
            "grazerHybridSwitchMass" : 300,
            "gridLines"         : true,
            "autoRespawn"       : false,
            "visualizeGrazing"  : true,
            "msDelayBetweenShots" : 100,
            "miniMapScale"      : false,
            "miniMapScaleValue" : 64,
            "enableBlobLock"    : false,
            "nextOnBlobLock"    : false,
            "rightClickFires"   : false,
            "showZcStats"       : true,
            // Menu Binds Values
            "MenuSwitchBlob"    : false,
            "MenuAcidMode"      : false,
            "MenuLiteBriteMode" : false,
            "MenuShowVisual"    : false,
            "MenuFireAtVirCur"  : false,
            "MenuNewGrazer"     : false,
            "MenuOldGrazer"     : false,
            "MenuSuspendMouse"  : false,
            "MenuRightClick"    : false,
            "MenuGrazingFix"    : false,
            "MenuFireAtVirBlob" : false,
            "MenuGrazerReset"   : false,
            "MenuGrazingVisual" : false,
            "MenuZoomFactor"    : false,
            "MenuPointLock"     : false,
            // Key Binds Defaults
            "KeySwitchBlob"     : "TAB",
            "KeyAcidMode"       : "A",
            "KeyLiteBriteMode"  : "L",
            "KeyShowVisual"     : "C",
            "KeyFireAtVirCur"   : "E",
            "KeyNewGrazer"      : "G",
            "KeyOldGrazer"      : "H",
            "KeySuspendMouse"   : "M",
            "KeyRightClick"     : "O",
            "KeyGrazingFix"     : "P",
            "KeyFireAtVirBlob"  : "R",
            "KeyGrazerReset"    : "T",
            "KeyGrazingVisual"  : "V",
            "KeyZoomFactor"     : "Z",
            "KeyPointLock"      : "S",
        };
        simpleSavedSettings(optionsAndDefaults);
    }
    makeCobbler();

    window.cobbler = cobbler;

    // ======================   Property & Var Name Restoration  =======================================================
    var zeach = {
        get connect()       {return Aa;},        // Connect
        get ctx()           {return g;},        // g_context
        get webSocket()     {return r;},        // g_socket
        get myIDs()         {return K;},        // g_playerCellIds
        get myPoints()      {return m;},        // g_playerCells
        get allNodes()      {return D;},        // g_cellsById
        get allItems()      {return v;},        // g_cells
        get mouseX2()       {return fa;},       // g_moveX
        get mouseY2()       {return ga;},       // g_moveY
        get mapLeft()       {return oa;},       // g_minX
        get mapTop()        {return pa;},       // g_minY
        get mapRight()      {return qa;},       // g_maxX
        get mapBottom()     {return ra;},       // g_maxY
        get isShowSkins()   {return fb;},       // g_showSkins
        // "g_showNames": "va",
        get isNightMode()   {return sa;},       // ??
        get isShowMass()    {return gb;},       // ??
        get gameMode()      {return O;},        // g_mode
        get fireFunction()  {return G;},        // SendCmd
        get isColors()      {return Ka;},       // g_noColors
        get defaultSkins()  {return jb;},       // g_skinNamesA
        get imgCache()      {return T;},       // ???
        get textFunc()      {return ua;},       // CachedCanvas
        get textBlobs()     {return Bb;},       // g_skinNamesB
        get hasNickname()   {return va;},        // g_showNames
        get scale()   {return k;},        //
        // Classes
        get CachedCanvas()  {return ua;},       // CachedCanvas
        get Cell()          {return aa;},        //
        // These never existed before but are useful
        get mapWidth()      {return  ~~(Math.abs(zeach.mapLeft) + zeach.mapRight);},
        get mapHeight()  {return  ~~(Math.abs(zeach.mapTop) + zeach.mapBottom);},
    };


    function restoreCanvasElementObj(objPrototype){
        var canvasElementPropMap = {
            'setValue'   : 'C',                 //
            'render'     : 'L',                 //
            'setScale'   : 'ea',                //
            'setSize'    : 'M',                 //
        };
        _.forEach(canvasElementPropMap, function(newPropName,oldPropName){
            Object.defineProperty(objPrototype, oldPropName, {
                get: function()     { return this[newPropName];},
                set: function(val)  { this[newPropName] = val; }
            });
        });
    }

    // Cell
    function restorePointObj(objPrototype){
        var pointPropMap = {
            'isVirus'     : 'h', //
            'nx'          : 'J', //
            'ny'          : 'K', //
            'setName'     : 'B', //
            'nSize'       : 'q', //
            'ox'          : 's', //
            'oy'          : 't', //
            'oSize'       : 'r', //
            'destroy'     : 'X', //
            'maxNameSize' : 'l', //
            'massText'    : 'O', //
            'nameCache'   : 'o', //
            'isAgitated'  : 'n'
        };
        _.forEach(pointPropMap, function(newPropName,oldPropName){
            Object.defineProperty(objPrototype, oldPropName, {
                get: function()     { return this[newPropName];},
                set: function(val)  { this[newPropName] = val; }
            });
        });
    }

    // ======================   Utility code    ==================================================================
    function isFood(blob){
        return (blob.nSize < 15);
    }
    function getSelectedBlob(){
        if(!_.contains(zeach.myIDs, selectedBlobID)){
            selectedBlobID = zeach.myPoints[0].id;
            //console.log("Had to select new blob. Its id is " + selectedBlobID);
        }
        return zeach.allNodes[selectedBlobID];
    }

    function isPlayerAlive(){
        return !!zeach.myPoints.length;
    }

    function sendMouseUpdate(ws, mouseX2, mouseY2, blob) {
        lastMouseCoords = {x: mouseX2, y: mouseY2};

        if (ws && ws.readyState == ws.OPEN) {
            var blobId = blob ? blob.id : 0;
            var z0 = new ArrayBuffer(13);
            var z1 = new DataView(z0);
            z1.setUint8(0, 16);
            z1.setInt32(1, mouseX2, true);
            z1.setInt32(5, mouseY2, true);
            z1.setUint32(9, blobId, true);
            ws.send(z0);
        }
    }

    function getMass(x){
        return x*x/100;
    }

    function lineDistance( point1, point2 ){
        var xs = point2.nx - point1.nx;
        var ys = point2.ny - point1.ny;

        return Math.sqrt( xs * xs + ys * ys );
    }

    function getVirusShotsNeededForSplit(cellSize){
        return ~~((149-cellSize)/7);
    }

    function calcTTR(element){

        var totalMass = _.sum(_.pluck(zeach.myPoints, "nSize").map(getMass));
        return ~~((((totalMass*0.02)*1000)+30000) / 1000) - ~~((Date.now() - element.splitTime) / 1000);
    }

    function getBlobShotsAvailable(blob) {
        return ~~(Math.max(0, (getMass(blob.nSize)-(35-18))/18));
    }

    function distanceFromCellZero(blob) {
        return isPlayerAlive() ? lineDistance(blob, getSelectedBlob()) :
            Math.sqrt((zeach.mapRight - zeach.mapLeft) * (zeach.mapRight - zeach.mapLeft) + (zeach.mapBottom - zeach.mapTop) * (zeach.mapBottom - zeach.mapTop));
    }

    function getViewport(interpolated) {
        var x =  _.sum(_.pluck(zeach.myPoints, interpolated ? "x" : "nx")) / zeach.myPoints.length;
        var y =  _.sum(_.pluck(zeach.myPoints, interpolated ? "y" : "ny")) / zeach.myPoints.length;
        var totalRadius =  _.sum(_.pluck(zeach.myPoints, interpolated ? "size" : "nSize"));
        var zoomFactor = Math.pow(Math.min(64.0 / totalRadius, 1), 0.4);
        var deltaX = 1024 / zoomFactor;
        var deltaY = 600 / zoomFactor;
        return { x: x, y: y, dx: deltaX, dy: deltaY };
    }

    function getMouseCoordsAsPseudoBlob(){
        return {
            "x": zeach.mouseX2,
            "y": zeach.mouseY2,
            "nx": zeach.mouseX2,
            "ny": zeach.mouseY2,
        };
    }

    // ======================   Grazing code    ==================================================================

    function checkCollision(myBlob, targetBlob, potential){
        // Calculate distance to target
        var dtt = lineDistance(myBlob, targetBlob);
        // Slope and normal slope
        var sl = (targetBlob.ny-myBlob.ny)/(targetBlob.nx-myBlob.nx);
        var ns = -1/sl;
        // y-int of ptt
        var yint1 = myBlob.ny - myBlob.nx*sl;
        if(!(lineDistance(myBlob, potential) < dtt)){
            // get second y-int
            var yint2 = potential.ny - potential.nx * ns;
            var interx = (yint2-yint1)/(sl-ns);
            var intery = sl*interx + yint1;
            var pseudoblob = {};
            pseudoblob.nx = interx;
            pseudoblob.ny = intery;
            if (((targetBlob.nx < myBlob.nx && targetBlob.nx < interx && interx < myBlob.nx) ||
                (targetBlob.nx > myBlob.nx && targetBlob.nx > interx && interx > myBlob.nx)) &&
                ((targetBlob.ny < myBlob.ny && targetBlob.ny < intery && intery < myBlob.ny) ||
                (targetBlob.ny > myBlob.ny && targetBlob.ny > intery && intery > myBlob.ny))){
                if(lineDistance(potential, pseudoblob) < potential.size+100){
                    return true;
                }
            }
        }
        return false;
    }

    function isSafeTarget(myBlob, targetBlob, threats){
        var isSafe = true;
        // check target against each enemy to make sure no collision is possible
        threats.forEach(function (threat){
            if(isSafe) {
                if(threat.isVirus) {
                    //todo once we are big enough, our center might still be far enough
                    // away that it doesn't cross virus but we still pop
                    if(checkCollision(myBlob, targetBlob, threat) )  {
                        isSafe = false;
                    }
                }
                else {
                    if ( checkCollision(myBlob, targetBlob, threat) || lineDistance(threat, targetBlob) <= threat.size + 200) {
                        isSafe = false;
                    }
                }
            }
        });
        return isSafe;
    }

    // All blobs that aren't mine
    function getOtherBlobs(){
        return _.omit(zeach.allNodes, zeach.myIDs);
    }

    // Gets any item which is a threat including bigger players and viruses
    function getThreats(blobArray, myMass) {
        // start by omitting all my IDs
        // then look for viruses smaller than us and blobs substantially bigger than us
        return _.filter(getOtherBlobs(), function(possibleThreat){
            var possibleThreatMass = getMass(possibleThreat.size);

            if(possibleThreat.isVirus) {
                // Viruses are only a threat if we are bigger than them
                return myMass >= possibleThreatMass;
            }
            // other blobs are only a threat if they cross the 'Large' threshhold
            return possibleThreatMass > myMass * Large;
        });
    }

    var throttledResetGrazingTargetId = null;

    function doGrazing() {
        var i;
        if(!isPlayerAlive()) {
            //isGrazing = false;
            return;
        }
        
        if(null === throttledResetGrazingTargetId){
            throttledResetGrazingTargetId = _.throttle(function (){
                grazzerTargetResetRequest = 'all';
                //console.log(~~(Date.now()/1000));
            }, 200);
        }
        
        
        if (grazzerTargetResetRequest == 'all') {
            grazzerTargetResetRequest = false;
            
            for(i = 0; i < zeach.myPoints.length; i++) {
                zeach.myPoints[i].grazingTargetID = false;
            }
        } else if (grazzerTargetResetRequest == 'current') {
            var pseudoBlob = getMouseCoordsAsPseudoBlob();

            pseudoBlob.size = getSelectedBlob().size;
            //pseudoBlob.scoreboard = scoreboard;
            var newTarget = findFoodToEat_old(pseudoBlob,zeach.allItems);
            if(-1 == newTarget){
                isGrazing = false;
                return;
            }
            getSelectedBlob().grazingTargetID = newTarget.id;
        }
        
        // with target fixation on, target remains until it's eaten by someone or
        // otherwise disappears. With it off target is constantly recalculated
        // at the expense of CPU
        if(!grazingTargetFixation) {
            throttledResetGrazingTargetId();
        }

        var target;


        var targets = findFoodToEat(!cobbler.grazerMultiBlob2);
        for(i = 0; i < zeach.myPoints.length; i++) {
            var point = zeach.myPoints[i];
            
            if (!cobbler.grazerMultiBlob2 && point.id != getSelectedBlob().id) {
                continue;
            }
                    
            point.grazingMode = isGrazing;
            if(cobbler.grazerHybridSwitch) {
                var mass = getMass(point.nSize);
                // switch over to new grazer once we pass the threshhold
                if(1 === point.grazingMode && mass > cobbler.grazerHybridSwitchMass){
                    point.grazingMode = 2; // We gained enough much mass. Use new grazer.
                }else if(2 === point.grazingMode && mass < cobbler.grazerHybridSwitchMass ){
                    point.grazingMode = 1; // We lost too much mass. Use old grazer.
                }
            }
            switch(point.grazingMode) {
                case 1: {

                    if(!zeach.allNodes.hasOwnProperty(point.grazingTargetID)) {
                        target = findFoodToEat_old(point, zeach.allItems);
                        if(-1 == target){
                            point.grazingMode = 2;
                            return;
                        }
                        point.grazingTargetID = target.id;
                    } else {
                        target = zeach.allNodes[point.grazingTargetID];
                    }
                    if (!cobbler.grazerMultiBlob2) {
                        sendMouseUpdate(zeach.webSocket, target.x + Math.random(), target.y + Math.random());
                    } else {
                        sendMouseUpdate(zeach.webSocket, target.x + Math.random(), target.y + Math.random(), point);
                    }
                
                break;
                }
                case 2: {
                    if (!cobbler.grazerMultiBlob2) {
                        target = _.max(targets, "v");
                        sendMouseUpdate(zeach.webSocket, target.x + Math.random(), target.y + Math.random());
                    } else {
                        target = targets[point.id];
                        sendMouseUpdate(zeach.webSocket, target.x + Math.random(), target.y + Math.random(), point);
                    }
                    
                    break;
                }
            }
        }

    }

    function dasMouseSpeedFunction(id, cx, cy, radius, nx, ny) {
        this.cx = cx; this.cy = cy; this.radius = radius; this.nx = nx; this.ny = ny;
        this.value = function(x, y) {
            x -= this.cx; y -= this.cy;
            var lensq = x*x + y*y;
            var len = Math.sqrt(lensq);

            var val = x * this.nx + y * this.ny;
            if (len > this.radius) {
                return {
                    id : id,
                    v: val / len,
                    dx: y * (this.nx * y - this.ny * x) / (lensq * len),
                    dy: x * (this.ny * x - this.nx * y) / (lensq * len),
                };
            } else {
                return {id: id, v: val / this.radius, dx: this.nx, dy: this.ny};
            }
        };
    }

    function dasBorderFunction(l, t, r, b, w) {
        this.l = l; 
        this.t = t;
        this.r = r; 
        this.b = b; 
        this.w = w;
        this.value = function(x, y) {
            var v = 0, dx = 0, dy = 0;
            if (x < this.l) {
                v += this.l - x;
                dx = -this.w;
            } else if (x > this.r) {
                v += x - this.r;
                dx = this.w;
            }

            if (y < this.t) {
                v += this.t - y;
                dy = -this.w;
            } else if (y > this.b) {
                v += y - this.b;
                dy = this.w;
            }

            return {v: v * this.w, dx: dx, dy: dy};
        };
    }

    function dasSumFunction(sumfuncs) {
        this.sumfuncs = sumfuncs;
        this.value = function(x, y) {
            return sumfuncs.map(function(func) {
                return func.value(x, y);
            }).reduce(function (acc, val) {
                acc.v += val.v; acc.dx += val.dx; acc.dy += val.dy;
                return acc;
            });
        };
    }

    function gradient_ascend(func, step, iters, id, x, y) {
        var max_step = step;

        var last = func.value(x, y);

        while(iters > 0) {
            iters -= 1;

            x += last.dx * step;
            y += last.dy * step;
            var tmp = func.value(x, y);
            if (tmp.v < last.v) {
                step /= 2;
            } else {
                step = Math.min(2 * step, max_step);
            }
            //console.log([x, y, tmp[0], step]);

            last.v = tmp.v;
            last.dx = (last.dx + tmp.dx)/2.0;
            last.dy = (last.dy + tmp.dy)/2.0;
        }

        return {id: id, x: x, y: y, v: last.v};
    }

    function augmentBlobArray(blobArray) {

        blobArray = blobArray.slice();

        var curTimestamp = Date.now();

        // Outdated blob id set
        var ghostSet = [];

        blobArray.forEach(function (element) {
            ghostSet[element.id] = true;
            element.lastTimestamp = curTimestamp;
        });

        var viewport = getViewport(false);

        ghostBlobs = _.filter(ghostBlobs, function (element) {
            return !ghostSet[element.id] && // a fresher blob with the same id doesn't exist in blobArray already
                (curTimestamp - element.lastTimestamp < 10000) && // last seen no more than 10 seconds ago
                (
                    (Math.abs(viewport.x - element.nx) > (viewport.dx + element.nSize) * 0.9) ||
                    (Math.abs(viewport.y - element.ny) > (viewport.dy + element.nSize) * 0.9)
                ); // outside of firmly visible area, otherwise there's no need to remember it
        });

        ghostBlobs.forEach(function (element) {
            blobArray.push(element);
        });

        ghostBlobs = blobArray;

        return blobArray;
    }
    function findFoodToEat(useGradient) {
        blobArray = augmentBlobArray(zeach.allItems);

        zeach.myPoints.forEach(function(cell) {
            cell.gr_is_mine = true;
        });

        var accs = zeach.myPoints.map(function (cell) {
            

            var per_food = [], per_threat = [];
            var acc = {
                id : cell.id,
                fx: 0,
                fy: 0,
                x: cell.nx,
                y: cell.ny,
                size : cell.nSize,
                per_food: per_food,
                per_threat: per_threat,
                cumulatives: [ { x: 0, y: 0}, { x: 0, y: 0} ],
            };
            
            if (!useGradient && cell.grazingMode != 2) {
                return acc;
            }
            
            var totalMass = _.sum(_.pluck(zeach.myPoints, "nSize").map(getMass));

            // Avoid walls too
            var wallArray = [];
            wallArray.push({id: -2, nx: cell.nx, ny: zeach.mapTop - 1, nSize: cell.nSize * 30});
            wallArray.push({id: -3, nx: cell.nx, ny: zeach.mapBottom + 1, nSize: cell.nSize * 30});
            wallArray.push({id: -4, ny: cell.ny, nx: zeach.mapLeft - 1, nSize: cell.nSize * 30});
            wallArray.push({id: -5, ny: cell.ny, nx: zeach.mapRight + 1, nSize: cell.nSize * 30});
            wallArray.forEach(function(el) {
                // Calculate repulsion vector
                var vec = { id: el.id, gr_type: true, x: cell.nx - el.nx, y: cell.ny - el.ny };
                var dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

                // Normalize it to unit length
                vec.x /= dist;
                vec.y /= dist;

                // Walls have pseudo-size to generate repulsion, but we can move farther.
                dist += cell.nSize / 2.0;

                dist = Math.max(dist, 0.01);

                // Walls. Hate them muchly.
                dist /= 10;

                // The more we're split and the more we're to lose, the more we should be afraid.
                dist /= cell.nSize * Math.sqrt(zeach.myPoints.length);

                // The farther they're from us the less repulsive/attractive they are.
                vec.x /= dist;
                vec.y /= dist;

                if(!isFinite(vec.x) || !isFinite(vec.y)) {
                    return;
                }

                // Save element-produced force for visualization
                per_threat.push(vec);

                // Sum forces from all threats
                acc.fx += vec.x;
                acc.fy += vec.y;
            });

            blobArray.forEach(function(el) {
                var vec = { id: el.id, x: cell.nx - el.nx, y: cell.ny - el.ny };

                if(el.gr_is_mine) {
                    return; //our cell, ignore
                } else if( !el.isVirus && (getMass(el.nSize) * 4 <= getMass(cell.nSize) * 3)) {
                    //if(!el.isVirus && (getMass(el.nSize) <= 9)) {
                    //vec.gr_type = null; //edible
                } else if (!el.isVirus && (getMass(el.nSize) * 3 < (getMass(cell.nSize) * 4))) {
                    return; //not edible ignorable
                    // TODO: shouldn't really be so clear-cut. Must generate minor repulsion/attraction depending on size.
                } else {
                    vec.gr_type = true; //threat
                }

                // Calculate repulsion vector
                var dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

                // Normalize it to unit length
                vec.x /= dist;
                vec.y /= dist;

                if(el.nSize > cell.nSize) {
                    if(el.isVirus) {
                        // Viruses are only a threat if they're smaller than us
                        return;
                    }

                    // Distance till consuming
                    dist -= el.nSize;
                    dist += cell.nSize / 3.0;
                    dist -= 11;

                    dist = Math.max(dist, 0.01);

                    // Prioritize targets by size
                    if(!vec.gr_type) {
                        //Non-threat
                        dist /= el.nSize;
                    } else {
                        var ratio = getMass(el.nSize) / getMass(cell.nSize);
                        // Cells that 1 to 8 times bigger are the most dangerous.
                        // Prioritize them by a truncated parabola up to 6 times.

                        // when we are fractured into small parts, we might underestimate
                        // how cells a lot bigger than us can be interested in us as a conglomerate of mass.
                        // So calculate threat index for our total mass too.
                        var ratio2 = getMass(el.nSize) / totalMass;
                        if(ratio2 < 4.5 && ratio > 4.5) {
                            ratio2 = 4.5;
                        }

                        ratio = Math.min(5, Math.max(0, - (ratio - 1) * (ratio - 8))) + 1;
                        ratio2 = Math.min(5, Math.max(0, - (ratio2 - 1) * (ratio2 - 8))) + 1;
                        ratio = Math.max(ratio, ratio2);

                        // The more we're split and the more we're to lose, the more we should be afraid.
                        dist /= ratio * cell.nSize * Math.sqrt(zeach.myPoints.length);
                    }

                } else {
                    // Distance till consuming
                    dist += el.nSize * 1 / 3;
                    dist -= cell.nSize;
                    dist -= 11;

                    if(el.isVirus) {
                        if(zeach.myPoints.length >= 16 ) {
                            // Can't split anymore so viruses are actually a good food!
                            delete vec.gr_type; //vec.gr_type = null;
                        } else {
                            // Hate them a bit less than same-sized blobs.
                            dist *= 2;
                        }
                    }

                    dist = Math.max(dist, 0.01);

                    // Prioritize targets by size
                    dist /= el.nSize;
                }

                if(!vec.gr_type) {
                    //Not a threat. Make it attractive.
                    dist = -dist;
                }

                // The farther they're from us the less repulsive/attractive they are.
                vec.x /= dist;
                vec.y /= dist;

                if(!isFinite(vec.x) || !isFinite(vec.y)) {
                    return;
                }

                // Save element-produced force for visualization
                (vec.gr_type ? per_threat : per_food).push(vec);

                // Sum forces per target type
                var cumul = acc.cumulatives[!vec.gr_type ? 1 : 0];
                cumul.x += vec.x;
                cumul.y += vec.y;
            });

            // Sum forces from all sources
            acc.fx += _.sum(_.pluck(acc.cumulatives, "x"));
            acc.fy += _.sum(_.pluck(acc.cumulatives, "y"));

            // Save resulting info for visualization
            cell.grazeInfo = acc;
            return acc;
        });
        
        if (useGradient) {
            var funcs = accs.map(function(acc) {
                return new dasMouseSpeedFunction(acc.id, acc.x, acc.y, 200, acc.fx, acc.fy);
            });

            // Pick gradient ascent step size for better convergence
            // so that coord jumps don't exceed ~50 units
            var step = _.sum(accs.map(function(acc) {
                return Math.sqrt(acc.fx * acc.fx + acc.fy * acc.fy);
            }));
            step = 50 / step;
            if(!isFinite(step)) {
                step = 50;
            }

            var viewport = getViewport(false);
            funcs.push(
                new dasBorderFunction(
                    viewport.x - viewport.dx,
                    viewport.y - viewport.dy,
                    viewport.x + viewport.dx,
                    viewport.y + viewport.dy,
                    -1000
                )
            );

            var func = new dasSumFunction(funcs);

            var results = accs.map(function(acc) {
                return gradient_ascend(func, step, 100, acc.id, acc.x, acc.y);
            });
        } else {
            results = accs.map(function(acc) { 
                var norm = Math.sqrt(acc.fx * acc.fx + acc.fy * acc.fy);
                return {id: acc.id, x: acc.x + 200 * acc.fx / norm, y: acc.y + 200 * acc.fy / norm };
            });
        }


        var reply = {};
        for (var i = 0; i < results.length; i++) {
            reply[results[i].id] = {id : -5, x : results[i].x, y : results[i].y, v : results[i].v};
        }

        return reply;
    }


    function findFoodToEat_old(cell, blobArray){
        var edibles = [];
        var densityResults = [];
        var threats = getThreats(blobArray, getMass(cell.size));
        blobArray.forEach(function (element){
            var distance = lineDistance(cell, element);
            if (!element.isSafeTarget) {
                element.isSafeTarget = {};
            }
            element.isSafeTarget[cell.id] = null;
            if( getMass(element.size) <= (getMass(cell.size) * 0.4) && !element.isVirus){
                if(isSafeTarget(cell, element, threats)){
                    edibles.push({"distance":distance, "id":element.id});
                    element.isSafeTarget[cell.id] = true;
                } else {
                    element.isSafeTarget[cell.id] = false;
                }
            }
        });
        edibles = edibles.sort(function(x,y){return x.distance<y.distance?-1:1;});
        edibles.forEach(function (element){
            var density = calcFoodDensity(cell, zeach.allNodes[element.id], blobArray)/(element.distance*2);
            densityResults.push({"density":density, "id":element.id});
        });
        if(0 === densityResults.length){
            //console.log("No target found");
            return avoidThreats(threats, cell);
            return -1;
        }
        var target = densityResults.sort(function(x,y){return x.density>y.density?-1:1;});
        //console.log("Choosing blob (" + target[0].id + ") with density of : "+ target[0].isVirusensity);
        return zeach.allNodes[target[0].id];
    }

    function avoidThreats(threats, cell){
        // Avoid walls too
        threats.push({x: cell.x, y: zeach.mapTop - 1, size: 1});
        threats.push({x: cell.x, y: zeach.mapBottom + 1, size: 1});
        threats.push({y: cell.y, x: zeach.mapLeft - 1, size: 1});
        threats.push({y: cell.y, x: zeach.mapRight + 1, size: 1});

        var direction = threats.reduce(function(acc, el) {
            // Calculate repulsion vector
            var vec = { x: cell.x - el.x, y: cell.y - el.y };
            var dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

            // Normalize it to unit length
            vec.x /= dist;
            vec.y /= dist;

            // Take enemy cell size into account
            dist -= el.size;

            // The farther they're from us the less repulsive they are
            vec.x /= dist;
            vec.y /= dist;

            // Sum forces from all threats
            acc.x += vec.x;
            acc.y += vec.y;

            return acc;
        }, {x: 0, y: 0});

        // Normalize force to unit direction vector
        var dir_norm = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        direction.x /= dir_norm;
        direction.y /= dir_norm;

        if(!isFinite(direction.x) || !isFinite(direction.y)) {
            return -1;
        }

        return { id: -5, x: cell.x + direction.x * cell.size * 5, y: cell.y + direction.y * cell.size * 5 };
    }

    function calcFoodDensity(cell, cell2, blobArray2){
        var MaxDistance2 = 250;
        var pelletCount = 0;
        blobArray2.forEach(function (element2){
            var distance2 = lineDistance(cell2, element2);

            var cond1 = getMass(element2.size) <= (getMass(cell.size) * 0.4);
            var cond2 = distance2 < MaxDistance2;
            var cond3 = !element2.isVirus;
            //console.log(cond1 + " " + distance2 + " " + cell2.isSafeTarget);
            if( cond1 && cond2 && cond3 && cell2.isSafeTarget[cell.id] ){
                pelletCount +=1;
            }
        });

        return pelletCount;
    }
// ======================   UI stuff    ==================================================================

    function drawRescaledItems(ctx) {
        if (showVisualCues && isPlayerAlive()) {
            drawMapBorders(ctx);
            drawGrazingLines_old(ctx);
            drawGrazingLines(ctx);
            if(cobbler.drawTail){
                drawTrailTail(ctx);
            }


            drawSplitGuide(ctx, getSelectedBlob());
            drawMiniMap();
        }
    }

    function getScoreBoardExtrasString(F) {
        var extras = " ";
        if (showVisualCues) {
            highScore = Math.max(highScore, ~~(F / 100));
            extras += " High: " + highScore.toString();
            if (isPlayerAlive()) {
                extras += "" + isPlayerAlive() ? " Alive: " + (~~((Date.now() - timeSpawned) / 1000)).toString() : "";
            }
        }
        return extras;
    }

    function drawCellInfos(noColors, ctx) {
        var color = this.color;
        if (showVisualCues) {
            color = setCellColors(this, zeach.myPoints);
            if (this.isVirus) {
                if (!zeach.allNodes.hasOwnProperty(nearestVirusID))
                    nearestVirusID = this.id;
                else if (distanceFromCellZero(this) < distanceFromCellZero(zeach.allNodes[nearestVirusID]))
                    nearestVirusID = this.id;
            }
            if(noColors) {
                ctx.fillStyle = "#FFFFFF";
                ctx.strokeStyle = "#AAAAAA"
            }
            else {
                ctx.fillStyle = color;
                ctx.strokeStyle = (this.id == nearestVirusID) ? "red" : color
            }
        }
    }

    function drawMapBorders(ctx) {
        if (zeach.isNightMode) {
            ctx.strokeStyle = '#FFFFFF';
        }
        ctx.beginPath();
        ctx.moveTo(zeach.mapLeft, zeach.mapTop);        // 0
        ctx.lineTo(zeach.mapRight, zeach.mapTop);       // >
        ctx.lineTo(zeach.mapRight, zeach.mapBottom);    // V
        ctx.lineTo(zeach.mapLeft, zeach.mapBottom);     // <
        ctx.lineTo(zeach.mapLeft, zeach.mapTop);        // ^
        ctx.stroke();
    }

    function drawSplitGuide(ctx, cell) {
        if( !isPlayerAlive() || !cobbler.splitGuide){
            return;
        }
        var radius = 660;
        var centerX = cell.x;
        var centerY = cell.y;
        var hold = ctx.globalAlpha;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius+cell.size, 0, 2 * Math.PI, false);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FF0000';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00FF00';
        ctx.stroke();
        ctx.globalAlpha = hold;
    }

    function isTeamMode(){
        return (zeach.gameMode === ":teams");
    }
    function setCellColors(cell,myPoints){
        if(!showVisualCues){
            return cell.color;
        }
        if(cobbler.rainbowPellets && isFood(cell)){
            return cell.color;
        }
        var color = cell.color;
        if (myPoints.length > 0 && !isTeamMode()) {
            var size_this =  getMass(cell.size);
            var size_that =  ~~(getSelectedBlob().size * getSelectedBlob().size / 100);
            if (cell.isVirus || myPoints.length === 0) {
                color = virusColor;
            } else if (~myPoints.indexOf(cell)) {
                color = myColor;
            } else if (size_this > size_that * Huge) {
                color = Huge_Color;
            } else if (size_this > size_that * Large) {
                color = Large_Color;
            } else if (size_this > size_that * Small) {
                color = Same_Color;
            } else if (size_this > size_that * Tiny) {
                color = Small_Color;
            } else {
                color = Tiny_Color;
            }
        }
        return color;
    }

    function displayDebugText(ctx, agarTextFunction) {

        if(0 >= cobbler.debugLevel) {
            return;
        }

        var textSize = 15;
        var debugStrings = [];
        if(1 <= cobbler.debugLevel) {
            debugStrings.push("v " + _version_);
            debugStrings.push("Server: " + serverIP);

            debugStrings.push(cobbler.KeyNewGrazer + " - " + "Grazing: " + (isGrazing ? (1 == isGrazing) ? "Old" : "New" : "Off"));
        }
        if(2 <= cobbler.debugLevel) {
            debugStrings.push(cobbler.KeySuspendMouse + " - " + "Suspend mouse: " + (suspendMouseUpdates ? "On" : "Off"));
            debugStrings.push(cobbler.KeyGrazingFix + " - " + "Grazing target fixation :" + (grazingTargetFixation ? "On" : "Off"));
            if(grazingTargetFixation){ debugStrings.push("  (T) to retarget");}
            debugStrings.push(cobbler.KeyRightClick + " - " + "Right click: " + (cobbler.rightClickFires ? "Fires @ virus" : "Default"))
            debugStrings.push(cobbler.KeyZoomFactor + " - " + "Zoom: " + zoomFactor.toString());
            if (isPlayerAlive()) {
                debugStrings.push("Location: " + Math.floor(getSelectedBlob().x) + ", " + Math.floor(getSelectedBlob().y));
            }

        }
        var offsetValue = 20;
        var text = new agarTextFunction(textSize, (zeach.isNightMode ? '#F2FBFF' : '#111111'));

        for (var i = 0; i < debugStrings.length; i++) {
            text.setValue(debugStrings[i]); // setValue
            var textRender = text.render();
            ctx.drawImage(textRender, 20, offsetValue);
            offsetValue += textRender.height;
        }
    }

    // Probably isn't necessary to throttle it ... but what the hell.
    var rescaleMinimap = _.throttle(function(){
        var minimapScale = cobbler.miniMapScaleValue;
        var scaledWidth = ~~(zeach.mapWidth/minimapScale);
        var scaledHeight = ~~(zeach.mapHeight/minimapScale);
        var minimap = jQuery("#mini-map");

        if(minimap.width() != scaledWidth || minimap.height() != scaledHeight || cobbler.minimapScaleCurrentValue != minimapScale){
            // rescale the div
            minimap.width(scaledWidth);
            minimap.height(scaledHeight);
            // rescale the canvas element
            minimap[0].width = scaledWidth;
            minimap[0].height = scaledHeight;
            cobbler.minimapScaleCurrentValue = minimapScale;
        }
    }, 5*1000);

    function drawMiniMap() {
        rescaleMinimap();
        var minimapScale = cobbler.miniMapScaleValue;
        miniMapCtx.clearRect(0, 0, ~~(zeach.mapWidth/minimapScale), ~~(zeach.mapHeight/minimapScale));

        _.forEach(_.values(getOtherBlobs()), function(blob){
            miniMapCtx.strokeStyle = blob.isVirus ?  "#33FF33" : 'rgb(52,152,219)' ;
            miniMapCtx.beginPath();
            miniMapCtx.arc((blob.nx+Math.abs(zeach.mapLeft)) / minimapScale, (blob.ny+Math.abs(zeach.mapTop)) / minimapScale, blob.size / minimapScale, 0, 2 * Math.PI);
            miniMapCtx.stroke();
        });

        _.forEach(zeach.myPoints, function(myBlob){
            miniMapCtx.strokeStyle = "#FFFFFF";
            miniMapCtx.beginPath();
            miniMapCtx.arc((myBlob.nx+Math.abs(zeach.mapLeft)) / minimapScale, (myBlob.ny+Math.abs(zeach.mapTop)) / minimapScale, myBlob.size / minimapScale, 0, 2 * Math.PI);
            miniMapCtx.stroke();
        });
    }
    function drawLine(ctx, point1, point2, color){
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.stroke();
    }

    function drawGrazingLines(ctx) {
        if(!isGrazing || !cobbler.visualizeGrazing ||  !isPlayerAlive())
        {
            //console.log("returning early");
            return;
        }
        var oldLineWidth = ctx.lineWidth;
        var oldColor = ctx.color;
        var oldGlobalAlpha = ctx.globalAlpha;

        zeach.myPoints.forEach(function(playerBlob) {
            if(!playerBlob.grazeInfo || playerBlob.grazingMode != 2) {
                return;
            }
            var grazeInfo = playerBlob.grazeInfo;

            var nullVec = { x: 0, y: 0 };
            var cumulatives = grazeInfo.cumulatives;
            var maxSize = 0.001;

            // Render threat forces
            grazeInfo.per_threat.forEach(function (grazeVec){
                var element = zeach.allNodes[grazeVec.id];

                if(!element) return; //Wall or dead or something

                //drawLine(ctx,element, playerBlob, "red" );
                //drawLine(ctx,element, {x: element.x + grazeVec.x / maxSize, y: element.y + grazeVec.y / maxSize }, "red" );
                drawLine(ctx,playerBlob, {x: playerBlob.x + grazeVec.x / maxSize, y: playerBlob.y + grazeVec.y / maxSize }, "red" );

                var grazeVecLen = Math.sqrt(grazeVec.x * grazeVec.x + grazeVec.y * grazeVec.y);

                ctx.globalAlpha = 0.5 / zeach.myPoints.length;
                ctx.beginPath();
                ctx.arc(element.x, element.y, grazeVecLen / maxSize / 20, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#FFFFFF';
                ctx.stroke();
                ctx.globalAlpha = 1;
            });

            if(zeach.myPoints.length <= 1) {
                // If we're not fragmented, render fancy food forces
                grazeInfo.per_food.forEach(function (grazeVec){
                    var element = zeach.allNodes[grazeVec.id];

                    if(!element) return; //Wall or dead or something

                    //drawLine(ctx,element, playerBlob, "white" );
                    drawLine(ctx,element, {x: element.x + grazeVec.x / maxSize, y: element.y + grazeVec.y / maxSize }, "green" );
                    //drawLine(ctx,playerBlob, {x: playerBlob.x + grazeVec.x / maxSize, y: playerBlob.y + grazeVec.y / maxSize }, "green" );
                });
            }

            // Prepare to render cumulatives
            maxSize *= grazeInfo.per_threat.length + grazeInfo.per_food.length;
            maxSize /= 10;

            ctx.lineWidth = 10;

            // Render summary force without special forces, like walls
            drawLine(ctx,playerBlob,
                {
                    x: playerBlob.x + (cumulatives[0].x + cumulatives[1].x) / maxSize,
                    y: playerBlob.y + (cumulatives[0].y + cumulatives[1].y) / maxSize,
                }, "gray"
            );

            // Render foods and threats force cumulatives
            drawLine(ctx,playerBlob, {x: playerBlob.x + cumulatives[1].x / maxSize, y: playerBlob.y + cumulatives[1].y / maxSize }, "green" );
            drawLine(ctx,playerBlob, {x: playerBlob.x + cumulatives[0].x / maxSize, y: playerBlob.y + cumulatives[0].y / maxSize }, "red" );

            // Render summary force with special forces, like walls
            ctx.lineWidth = 5;
            drawLine(ctx,playerBlob, {x: playerBlob.x + (grazeInfo.fx) / maxSize, y: playerBlob.y + (grazeInfo.fy) / maxSize }, "orange" );
            ctx.lineWidth = 1;
            drawLine(ctx,playerBlob, {x: playerBlob.x + 300 * (grazeInfo.fx) / maxSize, y: playerBlob.y + 300 * (grazeInfo.fy) / maxSize }, "orange" );
        });

        var viewport = getViewport(true);

        // Render sent mouse coords as a small circle
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(lastMouseCoords.x, lastMouseCoords.y, 0.01 * viewport.dx, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = zeach.isNightMode ? '#FFFFFF' : '#000000';
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Render viewport borders, useful for blob lookout and 10-sec-memoization debugging
        ctx.strokeStyle = zeach.isNightMode ? '#FFFFFF' : '#000000';
        ctx.lineWidth = 5;

        ctx.beginPath();
        ctx.moveTo(viewport.x - viewport.dx, viewport.y - viewport.dy);
        ctx.lineTo(viewport.x + viewport.dx, viewport.y - viewport.dy);
        ctx.lineTo(viewport.x + viewport.dx, viewport.y + viewport.dy);
        ctx.lineTo(viewport.x - viewport.dx, viewport.y + viewport.dy);
        ctx.lineTo(viewport.x - viewport.dx, viewport.y - viewport.dy);
        ctx.stroke();

        ctx.globalAlpha = oldGlobalAlpha;
        ctx.lineWidth = oldLineWidth;
        ctx.color = oldColor;
    }

    function drawTrailTail(ctx) {
        // Render trailing tail that indicates real movement,
        // based on the difference between client-interpolated and real coords.
        var trailScale = 5;
        zeach.myPoints.forEach(function(playerBlob) {
            var d = { x: playerBlob.nx - playerBlob.x, y: playerBlob.ny - playerBlob.y };
            drawLine(ctx,playerBlob, {x: playerBlob.x - d.x * trailScale, y: playerBlob.y - d.y * trailScale }, myColor );
            //drawLine(ctx,{x: playerBlob.ox, y: playerBlob.oy }, {x: playerBlob.nx, y: playerBlob.ny }, "green" );
        });
    }

    function drawGrazingLines_old(ctx) {
        if(!isGrazing || !cobbler.visualizeGrazing ||  !isPlayerAlive())
        {
            //console.log("returning early");
            return;
        }
        var oldLineWidth = ctx.lineWidth;
        var oldColor = ctx.color;
        
        ctx.lineWidth = 10;
        for(var i = 0; i < zeach.myPoints.length; i++) {
            var point = zeach.myPoints[i];
            if (point.grazingMode != 1) {
                continue;
            }
        
            if(_.has(zeach.allNodes, point.grazingTargetID)){
                drawLine(ctx, zeach.allNodes[point.grazingTargetID], point, "green");
            }
        }
        
        ctx.lineWidth = 2;
        for(var i = 0; i < zeach.myPoints.length; i++) {
            var point = zeach.myPoints[i];
            if (point.grazingMode != 1) {
                continue;
            }
            zeach.allItems.forEach(function (element){
                if (!element.isSafeTarget) {
                } else if(element.isSafeTarget[point.id] === true) {
                    drawLine(ctx, element, point, "white" );
                } else if (element.isSafeTarget[point.id] === false) {
                    drawLine(ctx, element, point, "red" );
                } else {
                    //drawLine(ctx,element, getSelectedBlob(), "blue" );
                }
            })
        }
        ctx.lineWidth = oldLineWidth;
        ctx.color = oldColor;

    }

// ======================   Virus Popper    ==================================================================
    function findNearestVirus(cell, blobArray){
        var nearestVirus = _.min(_.filter(blobArray, "isVirus", true), function(element) {
            return lineDistance(cell, element);
        });

        if( Infinity == nearestVirus){
            //console.log("No nearby viruses");
            return -1;
        }
        return nearestVirus;
    }

    function fireAtVirusNearestToBlob(blob, blobArray) {
        console.log("fireAtVirusNearestToBlob");
        var msDelayBetweenShots = cobbler.msDelayBetweenShots;
        nearestVirus = findNearestVirus(blob, blobArray);

        if(-1 == nearestVirus){
            console.log("No Nearby Virus Found");
            console.log(blobArray);
            console.log(blob);
            return;
        }

        // TODO: count availableshots and limit shots sent to  Math.min(shotsNeeded, ShotsAvailable)
        var shotsNeeded = getVirusShotsNeededForSplit(nearestVirus.size);
        var shotsFired = 0 / zeach.myPoints.length;
        if(shotsNeeded <= 0){
            return;
        }

        suspendMouseUpdates = true;
        console.log("Nearest Virus at: ("+ nearestVirus.x + "," + nearestVirus.y + ") requires " + shotsNeeded + " shots.");
        // two mouse updates in a row to make sure new position is locked in.
        sendMouseUpdate(zeach.webSocket, nearestVirus.x + Math.random(), nearestVirus.y + Math.random());
        window.setTimeout(function () { sendMouseUpdate(zeach.webSocket, nearestVirus.x + Math.random(), nearestVirus.y + Math.random()); }, 25);

        // schedules all shots needed spaced evenly apart by of 'msDelayBetweenShots'
        for ( ; shotsFired < shotsNeeded; shotsFired++){
            window.setTimeout(function () {
                sendMouseUpdate(zeach.webSocket, nearestVirus.x + Math.random(), nearestVirus.y + Math.random());
                zeach.fireFunction(21);
            }, msDelayBetweenShots *(shotsFired+1));
        }
        window.setTimeout(function () { suspendMouseUpdates = false;}, msDelayBetweenShots *(shotsFired+1));
    }


    function fireAtVirusNearestToCursor(){
        fireAtVirusNearestToBlob(getMouseCoordsAsPseudoBlob(), zeach.allItems);
    }

// ======================   Skins    ==================================================================
    /* AgarioMod.com skins have been moved to the very end of the file */
    var extendedSkins = {
        "billy mays" : "http://i.imgur.com/HavxFJu.jpg",
        "stannis": "http://i.imgur.com/JyZr0CI.jpg",
        "shrek is love" : "http://i.imgur.com/QDhkr4C.jpg",
        "shrek is life" : "http://i.imgur.com/QDhkr4C.jpg",
        "blueeyes" : "http://i.imgur.com/wxCfUws.jpg",
        "ygritte"  : "http://i.imgur.com/lDIFCT1.png",
        "lord kience" : "http://i.imgur.com/b2UXk15.png",
    }

    var skinsSpecial = {
        "white  light": "https://i.imgur.com/4y8szAE.png",
        "tubbymcfatfuck" : "http://tinyurl.com/TubbyMcFatFuck",
        "texas  doge" : "http://i.imgur.com/MVsLldL.jpg",
        "doge  helper" : "http://i.imgur.com/FzZebpk.jpg",
        "controless " : "https://i.imgur.com/uD5SW8X.jpg",
        "sqochit" : "http://i.imgur.com/AnowvFI.jpg",
        "drunken" : "http://i.imgur.com/JeKNRss.png",
    };


    // special skins are defined in this script by me and are never translucent
    function isSpecialSkin(targetName){
        return skinsSpecial.hasOwnProperty(targetName.toLowerCase());
    }
    // special skins are defined in this script by me and can be translucent
    function isExtendedSkin(targetName){
        return _.has(extendedSkins, targetName.toLowerCase());
    }

    function isAgarioModsSkin(targetName){
        if(!cobbler.amExtendedSkins){
            return false;
        }
        return _.includes(agariomodsSkins, targetName)
    }
    function isImgurSkin(targetName){
        if(!cobbler.imgurSkins){
            return false;
        }
        return _.startsWith(targetName, "i/");
    }
    function isAMConnectSkin(targetName){
        if(!cobbler.amConnectSkins){
            return false;
        }
        return _.startsWith(targetName, "*");
    }


    function customSkins(cell, defaultSkins, imgCache, showSkins, gameMode) {
        var retval = null;
        var userName = cell.name;
        var userNameLowerCase = userName.toLowerCase();
        if(":teams" ==  gameMode)
        {
            retval = null;
        }
        else if(!cell.isAgitated && showSkins ){
            if(-1 != defaultSkins.indexOf(userNameLowerCase) || isSpecialSkin(userNameLowerCase) || isImgurSkin(userNameLowerCase) ||
                    isAgarioModsSkin(userNameLowerCase) || isAMConnectSkin(userNameLowerCase) || isExtendedSkin(userNameLowerCase)){
                if (!imgCache.hasOwnProperty(userNameLowerCase)){
                    if(isSpecialSkin(userNameLowerCase)) {
                        imgCache[userNameLowerCase] = new Image;
                        imgCache[userNameLowerCase].src = skinsSpecial[userNameLowerCase];
                    }
                    else if(isExtendedSkin(userNameLowerCase)) {
                        imgCache[userNameLowerCase] = new Image;
                        imgCache[userNameLowerCase].src = extendedSkins[userNameLowerCase];
                    }
                    else if(isAgarioModsSkin(userNameLowerCase)) {
                        imgCache[userNameLowerCase] = new Image;
                        imgCache[userNameLowerCase].src = "http://skins.agariomods.com/i/" + userNameLowerCase + ".png";
                    }
                    else if(isAMConnectSkin(userNameLowerCase)) {
                        console.log("is AmConnect skin")
                        imgCache[userNameLowerCase] = new Image;
                        imgCache[userNameLowerCase].src = "http://connect.agariomods.com/img_" + userNameLowerCase.slice(1) + ".png";
                    }
                    else if(isImgurSkin(userNameLowerCase)){
                        imgCache[userNameLowerCase] = new Image;
                        imgCache[userNameLowerCase].src = "http://i.imgur.com/"+ userName.slice(2) +".png";
                    }

                    else{
                        imgCache[userNameLowerCase] = new Image;
                        imgCache[userNameLowerCase].src = "skins/" + userNameLowerCase + ".png";
                    }
                }
                if(0 != imgCache[userNameLowerCase].width && imgCache[userNameLowerCase].complete) {
                    retval = imgCache[userNameLowerCase];
                } else {
                    retval = null;
                }
            }
            else {
                retval = null;
            }
        }
        else {
            retval = null;
        }
        return retval;
    }


// ======================   Draw Functions    ==================================================================
    function shouldRelocateName(){
        if(cobbler.namesUnderBlobs && !this.isVirus) {
            return true;
        }
        return ((isExtendedSkin(this.name)|| isSpecialSkin(this.name) || /*isBitDoSkin(this.name)||*/ isAMConnectSkin(this.name)));
    }

    function drawCellName(isMyCell, kbIndex, itemToDraw){
        var yBasePos;
        var nameCache = this.nameCache;
        yBasePos = ~~this.y;
        // Viruses have empty name caches. If this is a virus with an empty name cache
        // then give it a name of the # of shots needed to split it.
        if(null == nameCache) {
            if (this.isVirus) {
                var virusSize = this.nSize;
                var shotsNeeded = getVirusShotsNeededForSplit(virusSize).toString();
                this.setName(shotsNeeded);
            } else if(!isFood(this)) {
                this.setName(this.nSize.toString()); // Stupid blank cells. Give them a name.
            }
        }

        if((zeach.hasNickname || isMyCell) && (this.name && (nameCache && (null == itemToDraw || -1 == zeach.textBlobs.indexOf(kbIndex)))) ) {

            itemToDraw = nameCache;
            itemToDraw.setValue(this.name);
            setCellName(this, itemToDraw);
            itemToDraw.setSize(this.maxNameSize());
            var scale = Math.ceil(10 * zeach.scale) / 10;
            itemToDraw.setScale(scale);

            setVirusInfo(this, itemToDraw, scale);
            itemToDraw = itemToDraw.render();
            var xPos = ~~(itemToDraw.width / scale);
            var yPos = ~~(itemToDraw.height / scale);

            if(shouldRelocateName.call(this)) {
                // relocate names to UNDER the cell rather than on top of it
                zeach.ctx.drawImage(itemToDraw, ~~this.x - ~~(xPos / 2), yBasePos + ~~(yPos ), xPos, yPos);
                yBasePos += itemToDraw.height / 2 / scale + 8;
            }
            else {
                zeach.ctx.drawImage(itemToDraw, ~~this.x - ~~(xPos / 2), yBasePos - ~~(yPos / 2), xPos, yPos);
            }
            yBasePos += itemToDraw.height / 2 / scale + 4;
        }
        return yBasePos;
    }

    function drawCellMass(yBasePos, itemToDraw){
        var massValue = (~~(getMass(this.size))).toString();
        // Append shots to mass if visual cues are enabled
        if(showVisualCues && _.contains(zeach.myIDs, this.id)){
            massValue += " (" + getBlobShotsAvailable(this).toString() + ")";
        }

        if(zeach.isShowMass) {
            var scale;
            if(itemToDraw || 0 == zeach.myPoints.length && ((!this.isVirus || this.isAgitated) && 20 < this.size)) {
                if(null == this.massText) {
                    this.massText = new zeach.CachedCanvas(this.maxNameSize() / 2, "#FFFFFF", true, "#000000");
                }
                itemToDraw = this.massText;
                itemToDraw.setSize(this.maxNameSize() / 2);
                itemToDraw.setValue(massValue); // precalculated & possibly appended
                scale = Math.ceil(10 * zeach.scale) / 10;
                itemToDraw.setScale(scale);

                // Tweak : relocated mass is line is bigger than stock
                itemToDraw.setScale(scale * ( shouldRelocateName.call(this) ? 2 : 1));

                var e = itemToDraw.render();
                var xPos = ~~(e.width / scale);
                var yPos = ~~(e.height / scale);
                if(shouldRelocateName.call(this)) {
                    // relocate mass to UNDER the cell rather than on top of it
                    zeach.ctx.drawImage(e, ~~this.x - ~~(xPos / 2), yBasePos + ~~(yPos), xPos, yPos);
                }
                else {
                    zeach.ctx.drawImage(e, ~~this.x - ~~(xPos / 2), yBasePos - ~~(yPos / 2), xPos, yPos);
                }
            }
        }

    }

// ======================   Misc    ==================================================================

    function switchCurrentBlob() {
        var myids_sorted = _.pluck(zeach.myPoints, "id").sort(); // sort by id
        var indexloc = _.indexOf(myids_sorted, selectedBlobID);
        if(-1 === indexloc){
            selectedBlobID = zeach.myPoints[0].id;
            console.log("Had to select new blob. Its id is " + selectedBlobID);
            return zeach.allNodes[selectedBlobID];
        }
        indexloc += 1;
        if(indexloc >= myids_sorted.length){
            selectedBlobID = zeach.myPoints[0].id;
            console.log("Reached array end. Moving to beginning with id " + selectedBlobID);
            return zeach.allNodes[selectedBlobID];
        }
        selectedBlobID = zeach.myPoints[indexloc].id;
        return zeach.allNodes[selectedBlobID];
    }

    function customKeyDownEvents(d) {
        //if('X'.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
        //        jQuery("#overlays").hide();
        //        jQuery("#ZCOverlay").hide();
        //        isGrazing = 0;
        //        showVisualCues = true;
        //        suspendMouseUpdates = false;
        //        cobbler.enableBlobLock = false;
        //}
        if(jQuery("#overlays").is(':visible')){
            return;
        }
        
        var TABKEY = 9;
        var TABTEXT = "TAB";
        
        if(cobbler.KeySwitchBlob == TABTEXT && 9 === d.keyCode && isPlayerAlive()) {
            d.preventDefault();
            switchCurrentBlob();
        }
        else if(cobbler.KeySwitchBlob.charCodeAt(0) === d.keyCode && isPlayerAlive()){
            d.preventDefault();
            switchCurrentBlob();
        }
        else if(cobbler.KeyAcidMode.charCodeAt(0) === d.keyCode && isPlayerAlive()){
            cobbler.isAcid = !cobbler.isAcid;
            setAcid(cobbler.isAcid);
        }
        else if(cobbler.KeyLiteBriteMode.charCodeAt(0) === d.keyCode && isPlayerAlive()){
            cobbler.isLiteBrite = !cobbler.isLiteBrite;
        }
    
        else if(cobbler.KeyShowVisual.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            grazzerTargetResetRequest = "all";
            showVisualCues = !showVisualCues;
            if(!showVisualCues) {
                zoomFactor = 10;
                jQuery("#mini-map").hide();
            }
            else
            {
                jQuery("#mini-map").show();
            }
        }
        else if(cobbler.KeyFireAtVirCur.charCodeAt(0) === d.keyCode && isPlayerAlive()){
            fireAtVirusNearestToCursor();
        }
        else if(cobbler.KeyNewGrazer.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            if(cobbler.grazerHybridSwitch && isGrazing){
                isGrazing = 0;
                return;
            }
            grazzerTargetResetRequest = "all";
            isGrazing = (2 == isGrazing) ? false : 2;
        }
        else if(cobbler.KeyOldGrazer.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            if(cobbler.grazerHybridSwitch && isGrazing){
                isGrazing = 0;
                return;
            }
            grazzerTargetResetRequest = "all";
            isGrazing = (1 == isGrazing) ? false : 1;
        }
        else if(cobbler.KeySuspendMouse.charCodeAt(0) === d.keyCode && isPlayerAlive()){
            suspendMouseUpdates = !suspendMouseUpdates;
        }
        else if(cobbler.KeyRightClick.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            cobbler.rightClickFires = !cobbler.rightClickFires;
        }
        else if(cobbler.KeyGrazingFix.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            grazingTargetFixation = !grazingTargetFixation;
        }
        else if(cobbler.KeyFireAtVirBlob.charCodeAt(0) === d.keyCode && isPlayerAlive()){
            fireAtVirusNearestToBlob(getSelectedBlob(),zeach.allItems);
        }
        else if(cobbler.KeyGrazerReset.charCodeAt(0) === d.keyCode && isPlayerAlive() && (1 == isGrazing)) {
            console.log("Retarget requested");
            grazzerTargetResetRequest = "current";
        }
        else if(cobbler.KeyGrazingVisual.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            cobbler.visualizeGrazing = !cobbler.visualizeGrazing;
        }
        else if(cobbler.KeyZoomFactor.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            // /*old*/ zoomFactor = (zoomFactor == 10 ? 11 : 10);
            /*new*/ zoomFactor = zoomFactor >= 11 ? 10 : +(zoomFactor + 0.1).toFixed(2);
        }
        else if('1'.charCodeAt(0) <= d.keyCode && '7'.charCodeAt(0) >= d.keyCode && isPlayerAlive()) {
            var id = d.keyCode - '1'.charCodeAt(0);
            if(id >= _.size(zeach.myPoints)) {return; }
            var arr =  _.sortBy(zeach.myPoints, "nSize").reverse();
            selectedBlobID = arr[id].id;
        }
        else if(cobbler.KeyPointLock.charCodeAt(0) === d.keyCode && isPlayerAlive()) {
            for(var i = 0; i < zeach.myPoints.length; i++) {
                var point = zeach.myPoints[i];
                point.locked = false;
            }
        }
    }

    function onAfterUpdatePacket() {
        if (!isPlayerAlive()){
            timeSpawned = null;
        }
        if(null == timeSpawned && isPlayerAlive()) {
            timeSpawned = Date.now(); // it's been reported we miss some instances of player spawning
        }
    }

    function onBeforeNewPointPacket() {
        if (0 == _.size(zeach.myPoints)){
            timeSpawned = Date.now();
        }
    }

    function setCellName(cell, d) {
        if (showVisualCues) {
            var pct;
            if (_.size(zeach.myPoints) > 1 && _.contains(zeach.myIDs, cell.id)) {
                var oldestSplitTime = _.min(zeach.myPoints, "splitTime");
                if(oldestSplitTime.id == cell.id){
                    d.setValue(cell.name);
                } else {
                    pct = (cell.nSize * cell.nSize) * 100 / (getSelectedBlob().nSize * getSelectedBlob().nSize);
                    d.setValue(calcTTR(cell) + " ttr" + " " + ~~(pct) + "%");}
            } else if (!cell.isVirus && isPlayerAlive()) {
                pct = ~~((cell.nSize * cell.nSize) * 100 / (getSelectedBlob().nSize * getSelectedBlob().nSize));
                d.setValue(cell.name + " " + pct.toString() + "%");
            }
        }
    }

    function setVirusInfo(cell, ctx, c) {
        ctx.setScale(c * 1.25);
        if (showVisualCues) {
            if (cell.isVirus) {
                cell.nameCache.setValue(getVirusShotsNeededForSplit(cell.nSize));
                var nameSizeMultiplier = 4;
                ctx.setScale(c * nameSizeMultiplier);
            }
        }
        if (cell.isVirus && !showVisualCues) {
            cell.nameCache.setValue(" ");
        }
    }


    function sendMultyMouseUpdate(send_normal) {
        for (var i = 0; i < zeach.myPoints.length; i++) {
            var blob = zeach.myPoints[i];
            var x = zeach.mouseX2;
            var y = zeach.mouseY2;
            if (blob.locked) {
                blob.last_locked--;
                if (blob.last_locked < 0) {
                    continue;
                }
                x = blob.locked_x;
                y = blob.locked_y;
            } else if (!send_normal) {
                continue;
            }
            var z0 = new ArrayBuffer(13);
            var z1 = new DataView(z0);
            z1.setUint8(0, 16);
            z1.setInt32(1, x, true);
            z1.setInt32(5, y, true);
            z1.setUint32(9, blob.id, true);
            zeach.webSocket.send(z0);
        }
    }

    function lockCurrentBlob() {
        if(!isPlayerAlive()){
            return;
        }
        var blob = getSelectedBlob();
        if (blob.locked) {
            blob.locked = false;
        } else {
            if (cobbler.nextOnBlobLock) {
                switchCurrentBlob();
            }
            blob.locked = true;
            blob.last_locked = 10;
            blob.locked_x = zeach.mouseX2;
            blob.locked_y = zeach.mouseY2;
        }
    }


// ======================   Start main    ==================================================================

    function kb() {
        wa = true;
        La();
        setInterval(La, 18E4);
        F = xa = document.getElementById("canvas");
        g = F.getContext("2d");
        // /*old*/ F.onmousewheel = function (e) {zoomFactor = e.wheelDelta > 0 ? 10 : 11;}
        /*new*/ F.onmousewheel = function (e) {
            if (e.wheelDelta > 0) {
                zoomFactor = zoomFactor <= 9.50 ? 9.50 : +(zoomFactor - 0.05).toFixed(2);
            } else {
                zoomFactor = zoomFactor >= 11 ? 11 : +(zoomFactor + 0.05).toFixed(2);
            }
            
        };
        F.onmousedown = function(a) {
            /*new*/if(cobbler.enableBlobLock) {lockCurrentBlob();}
            /*new*/if(isPlayerAlive() && cobbler.rightClickFires){fireAtVirusNearestToCursor();}return;
            if (Ma) {
                var c = a.clientX - (5 + q / 5 / 2);
                var b = a.clientY - (5 + q / 5 / 2);
                if (Math.sqrt(c * c + b * b) <= q / 5 / 2) {
                    U();
                    G(17);
                    return;
                }
            }
            ca = a.clientX;
            da = a.clientY;
            ya();
            U();
        };
        F.onmousemove = function(a) {
            ca = a.clientX;
            da = a.clientY;
            ya();
        };
        F.onmouseup = function() {
        };
        if (/firefox/i.test(navigator.userAgent)) {
            document.addEventListener("DOMMouseScroll", Na, false);
        } else {
            document.body.onmousewheel = Na;
        }
        var a = false;
        var c = false;
        var b = false;
        d.onkeydown = function(e) {
            if (!(32 != e.keyCode)) {
                if (!a) {
                    U();
                    G(17);
                    a = true;
                }
            }
            if (!(81 != e.keyCode)) {
                if (!c) {
                    G(18);
                    c = true;
                }
            }
            if (!(87 != e.keyCode)) {
                if (!b) {
                    U();
                    G(21);
                    b = true;
                }
            }
            if (27 == e.keyCode) {
                Oa(true);
            }
            /*new*/customKeyDownEvents(e);
        };
        d.onkeyup = function(e) {
            if (32 == e.keyCode) {
                a = false;
            }
            if (87 == e.keyCode) {
                b = false;
            }
            if (81 == e.keyCode) {
                if (c) {
                    G(19);
                    c = false;
                }
            }
        };
        d.onblur = function() {
            G(19);
            b = c = a = false;
        };
        d.onresize = Pa;
        d.requestAnimationFrame(Qa);
        setInterval(U, 40);
        if (x) {
            f("#region").val(x);
        }
        Ra();
        ea(f("#region").val());
        if (0 == za) {
            if (x) {
                N();
            }
        }
        V = true;
        f("#overlays").show();
        Pa();
    }
    function Na(a) {
        // /*old*/ H *= Math.pow(0.9, a.wheelDelta / -120 || (a.detail || 0));
        if (1 > H) {
            H = 1;
        }
        if (H > 4 / k) {
            H = 4 / k;
        }
    }
    function lb() {
        if (0.4 > k) {
            W = null;
        } else {
            var a = Number.POSITIVE_INFINITY;
            var c = Number.POSITIVE_INFINITY;
            var b = Number.NEGATIVE_INFINITY;
            var e = Number.NEGATIVE_INFINITY;
            var l = 0;
            var p = 0;
            for (;p < v.length;p++) {
                var h = v[p];
                if (!!h.N()) {
                    if (!h.R) {
                        if (!(20 >= h.size * k)) {
                            l = Math.max(h.size, l);
                            a = Math.min(h.x, a);
                            c = Math.min(h.y, c);
                            b = Math.max(h.x, b);
                            e = Math.max(h.y, e);
                        }
                    }
                }
            }
            W = mb.ja({
                ca : a - (l + 100),
                da : c - (l + 100),
                ma : b + (l + 100),
                na : e + (l + 100),
                ka : 2,
                la : 4
            });
            p = 0;
            for (;p < v.length;p++) {
                if (h = v[p], h.N() && !(20 >= h.size * k)) {
                    a = 0;
                    for (;a < h.a.length;++a) {
                        c = h.a[a].x;
                        b = h.a[a].y;
                        if (!(c < t - q / 2 / k)) {
                            if (!(b < u - s$$0 / 2 / k)) {
                                if (!(c > t + q / 2 / k)) {
                                    if (!(b > u + s$$0 / 2 / k)) {
                                        W.m(h.a[a]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    function ya() {
        fa = (ca - q / 2) / k + t;
        ga = (da - s$$0 / 2) / k + u;
    }
    function La() {
        if (null == ha) {
            ha = {};
            f("#region").children().each(function() {
                var a = f(this);
                var c = a.val();
                if (c) {
                    ha[c] = a.text();
                }
            });
        }
        f.get("https://m.agar.io/info", function(a) {
            var c = {};
            var b;
            for (b in a.regions) {
                var e = b.split(":")[0];
                c[e] = c[e] || 0;
                c[e] += a.regions[b].numPlayers;
            }
            for (b in c) {
                f('#region option[value="' + b + '"]').text(ha[b] + " (" + c[b] + " players)");
            }
        }, "json");
    }
    function Sa() {
        f("#adsBottom").hide();
        f("#overlays").hide();
        V = false;
        Ra();
        if (d.googletag) {
            if (d.googletag.pubads && d.googletag.pubads().clear) {
                d.googletag.pubads().clear(d.aa);
            }
        }
    }
    function ea(a) {
        if (a) {
            if (a != x) {
                if (f("#region").val() != a) {
                    f("#region").val(a);
                }
                x = d.localStorage.location = a;
                f(".region-message").hide();
                f(".region-message." + a).show();
                f(".btn-needs-server").prop("disabled", false);
                if (wa) {
                    N();
                }
            }
        }
    }
    function Oa(a) {
        if (!V) {
            I = null;
            nb();
            if (a) {
                w = 1;
            }
            V = true;
            f("#overlays").fadeIn(a ? 200 : 3E3);
            /*new*//*mikey*/OnShowOverlay(a);
        }
    }
    function ia(a) {
        f("#helloContainer").attr("data-gamemode", a);
        O = a;
        f("#gamemode").val(a);
    }
    function Ra() {
        if (f("#region").val()) {
            d.localStorage.location = f("#region").val();
        } else {
            if (d.localStorage.location) {
                f("#region").val(d.localStorage.location);
            }
        }
        if (f("#region").val()) {
            f("#locationKnown").append(f("#region"));
        } else {
            f("#locationUnknown").append(f("#region"));
        }
    }
    function nb() {
        if (ja) {
            ja = false;
            setTimeout(function() {
                ja = true;
            }, 6E4 * Ta);
            if (d.googletag) {
                if (d.googletag.pubads && d.googletag.pubads().clear) {
                    d.googletag.pubads().refresh(d.aa);
                }
            }
        }
    }
    function X(a) {
        return d.i18n[a] || (d.i18n_dict.en[a] || a);
    }
    function Ua() {
        var a = ++za;
        console.log("Find " + x + O);
        f.ajax("https://m.agar.io/", {
            error : function() {
                setTimeout(Ua, 1E3);
            },
            success : function(c) {
                if (a == za) {
                    c = c.split("\n");
                    if (c[2]) {
                        alert(c[2]);
                    }
                    Aa("ws://" + c[0], c[1]);
                    /*new*/ serverIP = c[0];
                }
            },
            dataType : "text",
            method : "POST",
            cache : false,
            crossDomain : true,
            data : (x + O || "?") + "\n154669603"
        });
    }
    function N() {
        if (wa) {
            if (x) {
                f("#connecting").show();
                Ua();
            }
        }
    }
    function Aa(a$$0, c) {
        if (r) {
            r.onopen = null;
            r.onmessage = null;
            r.onclose = null;
            try {
                r.close();
            } catch (b$$0) {
            }
            r = null;
        }
        if (null != J) {
            var e = J;
            J = function() {
                e(c);
            };
        }
        if (ob) {
            var l = a$$0.split(":");
            a$$0 = l[0] + "s://ip-" + l[1].replace(/\./g, "-").replace(/\//g, "") + ".tech.agar.io:" + (+l[2] + 2E3);
        }
        K = [];
        m = [];
        D = {};
        v = [];
        P = [];
        E = [];
        y = z = null;
        Q = 0;
        ka = false;
        console.log("Connecting to " + a$$0);
        r = new WebSocket(a$$0);
        r.binaryType = "arraybuffer";
        r.onopen = function() {
            var a;
            console.log("socket open");
            a = L(5);
            a.setUint8(0, 254);
            a.setUint32(1, 5, true);
            M(a);
            a = L(5);
            a.setUint8(0, 255);
            a.setUint32(1, 154669603, true);
            M(a);
            a = L(1 + c.length);
            a.setUint8(0, 80);
            var b = 0;
            for (;b < c.length;++b) {
                a.setUint8(b + 1, c.charCodeAt(b));
            }
            M(a);
            Va();
        };
        r.onmessage = pb;
        r.onclose = qb;
        r.onerror = function() {
            console.log("socket error");
        };
    }
    function L(a) {
        return new DataView(new ArrayBuffer(a));
    }
    function M(a) {
        r.send(a.buffer);
    }
    function qb() {
        if (ka) {
            la = 500;
        }
        console.log("socket close");
        setTimeout(N, la);
        la *= 2;
    }
    function pb(a) {
        rb(new DataView(a.data));
    }
    function rb(a) {
        function c$$0() {
            var c = "";
            for (;;) {
                var e = a.getUint16(b, true);
                b += 2;
                if (0 == e) {
                    break;
                }
                c += String.fromCharCode(e);
            }
            return c;
        }
        var b = 0;
        if (240 == a.getUint8(b)) {
            b += 5;
        }
        switch(a.getUint8(b++)) {
            case 16:
                sb(a, b);
                /*new*/onAfterUpdatePacket();
                break;
            case 17:
                Y = a.getFloat32(b, true);
                b += 4;
                Z = a.getFloat32(b, true);
                b += 4;
                $ = a.getFloat32(b, true);
                b += 4;
                break;
            case 20:
                m = [];
                K = [];
                break;
            case 21:
                Ba = a.getInt16(b, true);
                b += 2;
                Ca = a.getInt16(b, true);
                b += 2;
                if (!Da) {
                    Da = true;
                    ma = Ba;
                    na = Ca;
                }
                break;
            case 32:
                /*new*/onBeforeNewPointPacket();
                K.push(a.getUint32(b, true));
                b += 4;
                break;
            case 49:
                if (null != z) {
                    break;
                }
                var e$$0 = a.getUint32(b, true);
                b = b + 4;
                E = [];
                var l = 0;
                for (;l < e$$0;++l) {
                    var p = a.getUint32(b, true);
                    b = b + 4;
                    E.push({
                        id : p,
                        name : c$$0()
                    });
                }
                Wa();
                break;
            case 50:
                z = [];
                e$$0 = a.getUint32(b, true);
                b += 4;
                l = 0;
                for (;l < e$$0;++l) {
                    z.push(a.getFloat32(b, true));
                    b += 4;
                }
                Wa();
                break;
            case 64:
                oa = a.getFloat64(b, true);
                b += 8;
                pa = a.getFloat64(b, true);
                b += 8;
                qa = a.getFloat64(b, true);
                b += 8;
                ra = a.getFloat64(b, true);
                b += 8;
                Y = (qa + oa) / 2;
                Z = (ra + pa) / 2;
                $ = 1;
                if (0 == m.length) {
                    t = Y;
                    u = Z;
                    k = $;
                }
                break;
            case 81:
                var h = a.getUint32(b, true);
                b = b + 4;
                var d = a.getUint32(b, true);
                b = b + 4;
                var f = a.getUint32(b, true);
                b = b + 4;
                setTimeout(function() {
                    R({
                        e : h,
                        f : d,
                        d : f
                    });
                }, 1200);
        }
    }
    function sb(a, c) {
        Xa = A = Date.now();
        if (!ka) {
            ka = true;
            f("#connecting").hide();
            Ya();
            if (J) {
                J();
                J = null;
            }
        }
        var b = Math.random();
        Ea = false;
        var e = a.getUint16(c, true);
        c += 2;
        var l = 0;
        for (;l < e;++l) {
            var p = D[a.getUint32(c, true)];
            var h = D[a.getUint32(c + 4, true)];
            c += 8;
            if (p) {
                if (h) {
                    /*new*//*mikey*//*remap*/OnCellEaten(p,h);
                    /*new*/// Remove from 10-sec-remembered cells list by id
                    /*new*//*remap*/_.remove(ghostBlobs, {id: h.id});
                    h.X();
                    h.s = h.x;
                    h.t = h.y;
                    h.r = h.size;
                    h.J = p.x;
                    h.K = p.y;
                    h.q = h.size;
                    h.Q = A;
                }
            }
        }
        l = 0;
        for (;;) {
            e = a.getUint32(c, true);
            c += 4;
            if (0 == e) {
                break;
            }
            ++l;
            var d;
            p = a.getInt32(c, true);
            c += 4;
            h = a.getInt32(c, true);
            c += 4;
            d = a.getInt16(c, true);
            c += 2;
            var g = a.getUint8(c++);
            var k = a.getUint8(c++);
            var q = a.getUint8(c++);
            g = (g << 16 | k << 8 | q).toString(16);
            for (;6 > g.length;) {
                g = "0" + g;
            }
            g = "#" + g;
            k = a.getUint8(c++);
            q = !!(k & 1);
            var s = !!(k & 16);
            if (k & 2) {
                c += 4;
            }
            if (k & 4) {
                c += 8;
            }
            if (k & 8) {
                c += 16;
            }
            var r;
            var n = "";
            for (;;) {
                r = a.getUint16(c, true);
                c += 2;
                if (0 == r) {
                    break;
                }
                n += String.fromCharCode(r);
            }
            r = n;
            n = null;
            if (D.hasOwnProperty(e)) {
                n = D[e];
                n.P();
                n.s = n.x;
                n.t = n.y;
                n.r = n.size;
                n.color = g;
            } else {
                n = new aa(e, p, h, d, g, r);
                v.push(n);
                D[e] = n;
                n.sa = p;
                n.ta = h;
            }
            n.h = q;
            n.n = s;
            n.J = p;
            n.K = h;
            n.q = d;
            n.qa = b;
            n.Q = A;
            n.ba = k;
            if (r) {
                n.B(r);
            }
            if (-1 != K.indexOf(e)) {
                if (-1 == m.indexOf(n)) {
                    document.getElementById("overlays").style.display = "none";
                    m.push(n);
                    if (1 == m.length) {
                        /*new*//*mikey*/OnGameStart(zeach.myPoints);
                        t = n.x;
                        u = n.y;
                        Za();
                    }
                }
            }
        }
        b = a.getUint32(c, true);
        c += 4;
        l = 0;
        for (;l < b;l++) {
            e = a.getUint32(c, true);
            c += 4;
            n = D[e];
            if (null != n) {
                n.X();
            }
        }
        if (Ea) {
            if (0 == m.length) {
                Oa(false);
            }
        }
    }
    function U() {
        /*new*/if(isGrazing){ doGrazing(); return; }
        /*new*/if(suspendMouseUpdates){return;}
        var a;
        if (S()) {
            a = ca - q / 2;
            var c = da - s$$0 / 2;
            if (!(64 > a * a + c * c)) {
                if (!(0.01 > Math.abs($a - fa) && 0.01 > Math.abs(ab - ga))) {
                        $a = fa;
                        ab = ga;
                        a = L(13);
                        a.setUint8(0, 16);
                        a.setInt32(1, fa, true);
                        a.setInt32(5, ga, true);
                        a.setUint32(9, 0, true);
                        M(a);

                }
            }
        }
    }
    function Ya() {
        if (S() && null != I) {
            var a = L(1 + 2 * I.length);
            a.setUint8(0, 0);
            var c = 0;
            for (;c < I.length;++c) {
                a.setUint16(1 + 2 * c, I.charCodeAt(c), true);
            }
            M(a);
        }
    }
    function S() {
        return null != r && r.readyState == r.OPEN;
    }
    function G(a) {
        if (S()) {
            var c = L(1);
            c.setUint8(0, a);
            M(c);
        }
    }
    function Va() {
        if (S() && null != B) {
            var a = L(1 + B.length);
            a.setUint8(0, 81);
            var c = 0;
            for (;c < B.length;++c) {
                a.setUint8(c + 1, B.charCodeAt(c));
            }
            M(a);
        }
    }
    function Pa() {
        q = d.innerWidth;
        s$$0 = d.innerHeight;
        xa.width = F.width = q;
        xa.height = F.height = s$$0;
        var a = f("#helloContainer");
        a.css("transform", "none");
        var c = a.height();
        var b = d.innerHeight;
        if (c > b / 1.1) {
            a.css("transform", "translate(-50%, -50%) scale(" + b / c / 1.1 + ")");
        } else {
            a.css("transform", "translate(-50%, -50%)");
        }
        bb();
    }
    function cb() {
        var a;
        a = 1 * Math.max(s$$0 / 1080, q / 1920);
        return a *= H;
    }
    function tb() {
        if (0 != m.length) {
            var a = 0;
            var c = 0;
            for (;c < m.length;c++) {
                a += m[c].size;
            }
            a = Math.pow(Math.min(64 / a, 1), 0.4) * cb();
            //k = (9 * k + a) / 10;
            /*new*//*remap*/k = (9 * k + a) / zoomFactor;
        }
    }
    function bb() {
        var a$$0;
        var c$$0 = Date.now();
        ++ub;
        A = c$$0;
        if (0 < m.length) {
            tb();
            var b = a$$0 = 0;
            var e = 0;
            for (;e < m.length;e++) {
                m[e].P();
                a$$0 += m[e].x / m.length;
                b += m[e].y / m.length;
            }
            Y = a$$0;
            Z = b;
            $ = k;
            t = (t + a$$0) / 2;
            u = (u + b) / 2;
        } else {
            t = (29 * t + Y) / 30;
            u = (29 * u + Z) / 30;
            k = (9 * k + $ * cb()) / 10;
        }
        lb();
        ya();
        if (!Fa) {
            g.clearRect(0, 0, q, s$$0);
        }
        if (Fa) {
            g.fillStyle = sa ? "#111111" : "#F2FBFF";
            g.globalAlpha = 0.05;
            g.fillRect(0, 0, q, s$$0);
            g.globalAlpha = 1;
        } else {
            vb();
        }
        v.sort(function(a, c) {
            return a.size == c.size ? a.id - c.id : a.size - c.size;
        });
        g.save();
        g.translate(q / 2, s$$0 / 2);
        g.scale(k, k);
        g.translate(-t, -u);
        e = 0;
        for (;e < P.length;e++) {
            P[e].w(g);
        }
        e = 0;
        for (;e < v.length;e++) {
            v[e].w(g);
        }
        /*new*/drawRescaledItems(zeach.ctx);
        if (Da) {
            ma = (3 * ma + Ba) / 4;
            na = (3 * na + Ca) / 4;
            g.save();
            g.strokeStyle = "#FFAAAA";
            g.lineWidth = 10;
            g.lineCap = "round";
            g.lineJoin = "round";
            g.globalAlpha = 0.5;
            g.beginPath();
            e = 0;
            for (;e < m.length;e++) {
                g.moveTo(m[e].x, m[e].y);
                g.lineTo(ma, na);
            }
            g.stroke();
            g.restore();
        }
        g.restore();
        if (y) {
            if (y.width) {
                g.drawImage(y, q - y.width - 10, 10);
            }
        }
        /*new*//*mikey*/OnDraw(zeach.ctx);
        Q = Math.max(Q, wb());
        /*new*//*remap*/ var extras = " " + getScoreBoardExtrasString(Q);
        if (0 != Q) {
            if (null == ta) {
                ta = new ua(24, "#FFFFFF");
            }
            ta.C(X("score") + ": " + ~~(Q / 100));
            /*new*/ /*remap*/ ta.setValue("Score: " + ~~(Q / 100) + extras);
            b = ta.L();
            a$$0 = b.width;
            g.globalAlpha = 0.2;
            g.fillStyle = "#000000";
            g.fillRect(10, s$$0 - 10 - 24 - 10, a$$0 + 10, 34);
            g.globalAlpha = 1;
            g.drawImage(b, 15, s$$0 - 10 - 24 - 5);
            /*new*//*mikey*//*remap*/(zeach.myPoints&&zeach.myPoints[0]&&OnUpdateMass(wb()));
        }
        xb();
        c$$0 = Date.now() - c$$0;
        if (c$$0 > 1E3 / 60) {
            C -= 0.01;
        } else {
            if (c$$0 < 1E3 / 65) {
                C += 0.01;
            }
        }
        if (0.4 > C) {
            C = 0.4;
        }
        if (1 < C) {
            C = 1;
        }
        c$$0 = A - db;
        if (!S() || V) {
            w += c$$0 / 2E3;
            if (1 < w) {
                w = 1;
            }
        } else {
            w -= c$$0 / 300;
            if (0 > w) {
                w = 0;
            }
        }
        if (0 < w) {
            g.fillStyle = "#000000";
            g.globalAlpha = 0.5 * w;
            g.fillRect(0, 0, q, s$$0);
            g.globalAlpha = 1;
        }
        db = A;
        /*new*/displayDebugText(zeach.ctx,zeach.textFunc);
    }
    function vb() {
        g.fillStyle = sa ? "#111111" : "#F2FBFF";
        g.fillRect(0, 0, q, s$$0);
        /*new*/if(!cobbler.gridLines){return;}
        g.save();
        g.strokeStyle = sa ? "#AAAAAA" : "#000000";
        g.globalAlpha = 0.2 * k;
        var a = q / k;
        var c = s$$0 / k;
        var b = (-t + a / 2) % 50;
        for (;b < a;b += 50) {
            g.beginPath();
            g.moveTo(b * k - 0.5, 0);
            g.lineTo(b * k - 0.5, c * k);
            g.stroke();
        }
        b = (-u + c / 2) % 50;
        for (;b < c;b += 50) {
            g.beginPath();
            g.moveTo(0, b * k - 0.5);
            g.lineTo(a * k, b * k - 0.5);
            g.stroke();
        }
        g.restore();
    }
    function xb() {
        if (Ma && Ga.width) {
            var a = q / 5;
            g.drawImage(Ga, 5, 5, a, a);
        }
    }
    function wb() {
        var a = 0;
        var c = 0;
        for (;c < m.length;c++) {
            a += m[c].q * m[c].q;
        }
        return a;
    }
    function Wa() {
        y = null;
        if (null != z || 0 != E.length) {
            if (null != z || va) {
                y = document.createElement("canvas");
                var a = y.getContext("2d");
                var c = 60;
                c = null == z ? c + 24 * E.length : c + 180;
                var b = Math.min(200, 0.3 * q) / 200;
                y.width = 200 * b;
                y.height = c * b;
                a.scale(b, b);
                a.globalAlpha = 0.4;
                a.fillStyle = "#000000";
                a.fillRect(0, 0, 200, c);
                a.globalAlpha = 1;
                a.fillStyle = "#FFFFFF";
                b = null;
                b = X("leaderboard");
                a.font = "30px Ubuntu";
                a.fillText(b, 100 - a.measureText(b).width / 2, 40);
                if (null == z) {
                    a.font = "20px Ubuntu";
                    c = 0;
                    for (;c < E.length;++c) {
                        b = E[c].name || X("unnamed_cell");
                        if (!va) {
                            b = X("unnamed_cell");
                        }
                        if (-1 != K.indexOf(E[c].id)) {
                            if (m[0].name) {
                                b = m[0].name;
                            }
                            a.fillStyle = "#FFAAAA";
                            /*new*//*mikey*//*remap*/OnLeaderboard(c+1);
                        } else {
                            a.fillStyle = "#FFFFFF";
                        }
                        b = c + 1 + ". " + b;
                        a.fillText(b, 100 - a.measureText(b).width / 2, 70 + 24 * c);
                    }
                } else {
                    c = b = 0;
                    for (;c < z.length;++c) {
                        var e = b + z[c] * Math.PI * 2;
                        a.fillStyle = yb[c + 1];
                        a.beginPath();
                        a.moveTo(100, 140);
                        a.arc(100, 140, 80, b, e, false);
                        a.fill();
                        b = e;
                    }
                }
            }
        }
    }
    function Ha(a, c, b, e, l) {
        this.V = a;
        this.x = c;
        this.y = b;
        this.i = e;
        this.b = l;
    }
    function aa(a, c, b, e, l, p) {
        this.id = a;
        this.s = this.x = c;
        this.t = this.y = b;
        this.r = this.size = e;
        this.color = l;
        this.a = [];
        this.W();
        this.B(p);
        /*new*/this.splitTime = Date.now();
    }
    function ua(a, c, b, e) {
        if (a) {
            this.u = a;
        }
        if (c) {
            this.S = c;
        }
        this.U = !!b;
        if (e) {
            this.v = e;
        }
    }
    function R(a, c) {
        var b$$0 = "1" == f("#helloContainer").attr("data-has-account-data");
        /*new*/var b$$0 = "1" == f("#ZCOverlay").attr("data-has-account-data");

        f("#helloContainer").attr("data-has-account-data", "1");
        if (null == c && d.localStorage.loginCache) {
            var e = JSON.parse(d.localStorage.loginCache);
            e.f = a.f;
            e.d = a.d;
            e.e = a.e;
            d.localStorage.loginCache = JSON.stringify(e);
        }
        if (b$$0) {
            var l = +f(".agario-exp-bar .progress-bar-text").text().split("/")[0];
            b$$0 = +f(".agario-exp-bar .progress-bar-text").text().split("/")[1].split(" ")[0];
            e = f(".agario-profile-panel .progress-bar-star").text();
            if (e != a.e) {
                R({
                    f : b$$0,
                    d : b$$0,
                    e : e
                }, function() {
                    f(".agario-profile-panel .progress-bar-star").text(a.e);
                    f(".agario-exp-bar .progress-bar").css("width", "100%");
                    f(".progress-bar-star").addClass("animated tada").one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", function() {
                        f(".progress-bar-star").removeClass("animated tada");
                    });
                    setTimeout(function() {
                        f(".agario-exp-bar .progress-bar-text").text(a.d + "/" + a.d + " XP");
                        R({
                            f : 0,
                            d : a.d,
                            e : a.e
                        }, function() {
                            R(a, c);
                        });
                    }, 1E3);
                });
            } else {
                var p = Date.now();
                var h = function() {
                    var b;
                    b = (Date.now() - p) / 1E3;
                    b = 0 > b ? 0 : 1 < b ? 1 : b;
                    b = b * b * (3 - 2 * b);
                    f(".agario-exp-bar .progress-bar-text").text(~~(l + (a.f - l) * b) + "/" + a.d + " XP");
                    f(".agario-exp-bar .progress-bar").css("width", (88 * (l + (a.f - l) * b) / a.d).toFixed(2) + "%");
                    if (1 > b) {
                        d.requestAnimationFrame(h);
                    } else {
                        if (c) {
                            c();
                        }
                    }
                };
                d.requestAnimationFrame(h);
            }
        } else {
            f(".agario-profile-panel .progress-bar-star").text(a.e);
            f(".agario-exp-bar .progress-bar-text").text(a.f + "/" + a.d + " XP");
            f(".agario-exp-bar .progress-bar").css("width", (88 * a.f / a.d).toFixed(2) + "%");
            if (c) {
                c();
            }
        }
    }
    function eb(a) {
        if ("string" == typeof a) {
            a = JSON.parse(a);
        }
        if (Date.now() + 18E5 > a.ia) {
            f("#helloContainer").attr("data-logged-in", "0");
        } else {
            d.localStorage.loginCache = JSON.stringify(a);
            B = a.fa;
            f(".agario-profile-name").text(a.name);
            Va();
            R({
                f : a.f,
                d : a.d,
                e : a.e
            });
            f("#helloContainer").attr("data-logged-in", "1");
        }
    }
    function zb(a) {
        a = a.split("\n");
        eb({
            name : a[0],
            ra : a[1],
            fa : a[2],
            ia : 1E3 * +a[3],
            e : +a[4],
            f : +a[5],
            d : +a[6]
        });
    }
    function Ia(a$$0) {
        if ("connected" == a$$0.status) {
            var c = a$$0.authResponse.accessToken;
            d.FB.api("/me/picture?width=180&height=180", function(a) {
                d.localStorage.fbPictureCache = a.data.url;
                f(".agario-profile-picture").attr("src", a.data.url);
            });
            f("#helloContainer").attr("data-logged-in", "1");
            if (null != B) {
                f.ajax("https://m.agar.io/checkToken", {
                    error : function() {
                        B = null;
                        Ia(a$$0);
                    },
                    success : function(a) {
                        a = a.split("\n");
                        R({
                            e : +a[0],
                            f : +a[1],
                            d : +a[2]
                        });
                    },
                    dataType : "text",
                    method : "POST",
                    cache : false,
                    crossDomain : true,
                    data : B
                });
            } else {
                f.ajax("https://m.agar.io/facebookLogin", {
                    error : function() {
                        B = null;
                        f("#helloContainer").attr("data-logged-in", "0");
                    },
                    success : zb,
                    dataType : "text",
                    method : "POST",
                    cache : false,
                    crossDomain : true,
                    data : c
                });
            }
        }
    }
    if (!d.agarioNoInit) {
        var Ja = d.location.protocol;
        var ob = "https:" == Ja;
        var xa;
        var g;
        var F;
        var q;
        var s$$0;
        var W = null;
        var r = null;
        var t = 0;
        var u = 0;
        var K = [];
        var m = [];
        var D = {};
        var v = [];
        var P = [];
        var E = [];
        var ca = 0;
        var da = 0;
        var fa = -1;
        var ga = -1;
        var ub = 0;
        var A = 0;
        var db = 0;
        var I = null;
        var oa = 0;
        var pa = 0;
        var qa = 1E4;
        var ra = 1E4;
        var k = 1;
        var x = null;
        var fb = true;
        var va = true;
        var Ka = false;
        var Ea = false;
        var Q = 0;
        var sa = false;
        var gb = false;
        var Y = t = ~~((oa + qa) / 2);
        var Z = u = ~~((pa + ra) / 2);
        var $ = 1;
        var O = "";
        var z = null;
        var wa = false;
        var Da = false;
        var Ba = 0;
        var Ca = 0;
        var ma = 0;
        var na = 0;
        var hb = 0;
        var yb = ["#333333", "#FF3333", "#33FF33", "#3333FF"];
        var Fa = false;
        var ka = false;
        var Xa = 0;
        var B = null;
        var H = 1;
        var w = 1;
        var V = true;
        var za = 0;
        var Ma = "ontouchstart" in d && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        var Ga = new Image;
        Ga.src = "img/split.png";
        var ib = document.createElement("canvas");
        if ("undefined" == typeof console || ("undefined" == typeof DataView || ("undefined" == typeof WebSocket || (null == ib || (null == ib.getContext || null == d.localStorage))))) {
            alert("You browser does not support this game, we recommend you to use Firefox to play this");
        } else {

            var ha = null;
            d.setNick = function(a) {
                Sa();
                I = a;
                Ya();
                Q = 0;
                /*new*/GM_setValue("nick", a);
                /*new*/console.log("Storing '" + a + "' as nick");
            };
            d.setRegion = ea;
            d.setSkins = function(a) {
                fb = a;
            };
            d.setNames = function(a) {
                va = a;
            };
            d.setDarkTheme = function(a) {
                sa = a;
            };
            d.setColors = function(a) {
                Ka = a;
            };
            d.setShowMass = function(a) {
                gb = a;
            };
            d.spectate = function() {
                I = null;
                G(1);
                Sa();
            };
            d.setGameMode = function(a) {
                if (a != O) {
                    if (":party" == O) {
                        f("#helloContainer").attr("data-party-state", "0");
                    }
                    ia(a);
                    if (":party" != a) {
                        N();
                    }
                }
            };
            d.setAcid = function(a) {
                Fa = a;
            };
            d.setLiteBrite = function(a) {
                Fa = a;
            };
            if (null != d.localStorage) {
                if (null == d.localStorage.AB9) {
                    d.localStorage.AB9 = 0 + ~~(100 * Math.random());
                }
                hb = +d.localStorage.AB9;
                d.ABGroup = hb;
            }
            f.get(Ja + "//gc.agar.io", function(a) {
                var c = a.split(" ");
                a = c[0];
                c = c[1] || "";
                if (-1 == ["UA"].indexOf(a)) {
                    jb.push("ussr");
                }
                if (-1 != d.navigator.userAgent.indexOf("Android")) {
                    d.location.href = "market://details?id=com.miniclip.agar.io";
                }
                if (-1 != d.navigator.userAgent.indexOf("iPhone") || (-1 != d.navigator.userAgent.indexOf("iPad") || -1 != d.navigator.userAgent.indexOf("iPod"))) {
                    d.location.href = "https://itunes.apple.com/app/agar.io/id995999703";
                }
                if (ba.hasOwnProperty(a)) {