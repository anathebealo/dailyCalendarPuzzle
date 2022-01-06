
/* Add some swizzlers, because I hate the world. 
 */
Object.defineProperty(Array.prototype, 'x', {
    get: function() {
        return this[0];
    }, 
    set: function(x){ this[0] = x; }
});
Object.defineProperty(Array.prototype, 'y', {
    get: function() {
        return this[1];
    },
    set: function(x){ this[1] = x; }
});
Object.defineProperty(Array.prototype, 'z', {
    get: function() {
        return this[2];
    },
    set: function(z){ this[2] = z; }
});
Array.prototype.shallowCopy = function(){
    // console.log(this);
    var next = [];
    for (let i = 0; i < this.length; i++) {
        next[i] = this[i];
    }
    return next;
}
String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

proveCoordIdsAreUnique();



// construct the base pieces, and let some helper functions work out the details.
var pieces = [
    ...createPieceOrientations('big L', 'J', [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 0]
    ]), 
    ...createPieceOrientations('lil L', 'i', [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0]
    ]), 
    ...createPieceOrientations('the Z', 'z', [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2],
    ]), 
    ...createPieceOrientations('Lightning', 'n', [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
        [1, 3],
    ]), 
    ...createPieceOrientations('lil squiggle', 's', [
        [0, 0],
        [1, 0],
        [1, -1],
        [2, -1]
    ]),
    ...createPieceOrientations('big boi', 'B', [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
    ]),
    ...createPieceOrientations('line', '|', [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
    ]),
    ...createPieceOrientations('T bone', 'T', [
        [0, 0],
        [0, 1],
        [0, 2],
        [-1, 0],
        [1, 0],
    ]),
    ...createPieceOrientations('Big L', 'L', [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [0, 2],
    ]),
    ...createPieceOrientations('U mad?', 'u', [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [2, 1],
    ]),
]


// pieces.forEach(p => {
//     console.log(p);
//     console.log(pieceToString(p))
// })

// console.log('count', pieces.length)

// pieces = [pieces[0], pieces[12]];
var board = createBoard(pieces);

var requiredPoints = [ 
    pointToId([0, 0]), // position of month
    pointToId([0, 2]), // position of day
    pointToId([6, 7]), // position of weekday
]
// requiredPoints.length = 0 // uncomment to erase any required day.

var winners = bfs(board);
console.log('done', winners.length);

winners.forEach(winner => {
    console.log('WINNER!!!', hashBoard(winner));
    console.log(getBoardString(winner))
});
var nextboards = expandBoard(board);
// console.log('next board states', nextboards.length)

// nextboards.forEach(b => console.log(hashBoard(b)));
// var res = tryPutPieceOnBoard(pieces[0], [0, 0], board)

// console.log(getBoardString(board));
// console.log(getBoardString(res));
// console.log(res.board.zCounts)

// console.log('pieces left', res.board.availablePieces.length);
// res.board.availablePieces.forEach(p => console.log(p.name))

function bfs(originalBoard) {

    var toExplore = []; 

    // BFS
    // var explore = (elem) => toExplore.push(elem);
    // var next = () => {
    //     var elem = toExplore.shift();
    //     return elem;
    // };

    var explore = (elem) => toExplore.push(elem);
    var next = () => toExplore.pop();
    
    var seen = new Set();
    explore(originalBoard);

    var winners = [];
    var maxIterations = 250000;
    var iteration = 0
    var ignoredDupes = 0;
    var deadEnds = 0;

    var last;
    while (iteration < maxIterations && toExplore.length > 0){
        let curr = next();
        last = curr;
        // have we seen this board before?
        var hash = hashBoard(curr);
        if (seen.has(hash)) {
            ignoredDupes ++;
            continue;
        }
        seen.add(hash);
        iteration ++;

        // is this a terminal node?
        if (curr.availablePieces.length == 0){
            // console.log('found a solved board!', curr);
            winners.push(curr);
        }

        // expand the neighbors, and add them!
        let neighbors = expandBoard(curr);
        if (neighbors.length == 0) deadEnds ++;
        neighbors.forEach(explore);
        // for (var i = 0 ; i < neighbors.length; i ++){
        //     explore
        // }
    }

    if (iteration == maxIterations){
        console.warn('BFS HIT MAX ITER')
    }
    console.log(`search complete. ignored=[${ignoredDupes}] iters=[${iteration}] deadEnds=[${deadEnds}] found=[${winners.length}]`)
    // console.log(last)
    // console.log(getBoardString(last))
    return winners;
}

function hashBoard(board){
    // easiest hash is a json of the points, but is also very slow. TODO: make it better :)
    return JSON.stringify(Array.from(board.pointMap.entries())).hashCode();
}

function expandBoard(originalBoard){
    // this board state will produce a set of new board states, given its available pieces left. 

    var boards = []
    for (var y = board.mins.y; y < board.maxes.y; y ++){
        for (var x = board.mins.x ; x < board.maxes.x; x ++){
            var coord = [x, y]
            for (var pieceIndex = 0 ; pieceIndex < originalBoard.availablePieces.length; pieceIndex++){
                // try every piece at every position.
                var piece = originalBoard.availablePieces[pieceIndex];
                var res = tryPutPieceOnBoard(piece, coord, originalBoard);
                if (res.isValid){
                    boards.push(res.board);
                }
            }
        }
    }
    return boards;
}


function tryPutPieceOnBoard(piece, point, board){
    const nextBoard = {...board}
    nextBoard.zCounts = [...board.zCounts]
    nextBoard.availablePieces = board.availablePieces.filter(x => x.pieceId != piece.pieceId);
    nextBoard.pointMap = new Map(board.pointMap); // copy.
    // apply piece!

    // for (var y = piece.mins.y; y <= piece.maxes.y ; y ++){
    //     for (var x = piece.mins.x; x <= piece.maxes.x ; x ++){

    var isValid = true;
    for (var i = 0 ; i < piece.points.length; i ++){
        var x = piece.points[i].x + point.x;
        var y = piece.points[i].y + point.y;

        var coord = pointToId([x, y ]);
        var z = nextBoard.openPoints.get(coord);
        nextBoard.zCounts[z] --;

        // if out of bounds, mark invalid!
        if (!nextBoard.pointMap.has(coord)){
            isValid = false;
        }
        // if the spot is already occupied, mark invalid!
        if (nextBoard.pointMap.get(coord) != '..'){
            isValid = false;
        }

        // if there are no more
        if (nextBoard.zCounts[z] <= 0){
            // console.log('failed due to zcount')
            isValid = false;
        }

        // all required points must still exist.
        if (requiredPoints.filter(req => nextBoard.pointMap.get(req) != '..').length > 0){
            // console.log('failed due to thing')
            isValid = false;
        }

        nextBoard.pointMap.set(coord, piece.id)
    }
    
    return {
        board: {
            ...nextBoard,
            availablePieces: nextBoard.availablePieces.filter(x => x.name != piece.name)
        },
        isValid: isValid
    };
}

function createBoard(pieces){
    points = [];
    for (var y = 0 ; y < 8 ; y ++){
        for (var x = 0 ; x < 7 ; x ++){
            if (y == 7 && x < 4) continue;
            if (x == 6 && y < 2) continue;
            var z = 0;
            if (y > 1) z = 1;
            if (y > 5 && x > 2) z = 2;
            points.push([x, y, z])
        }
    }

    var {mins, maxes} = getMinMax(points);
    var pointMap = new Map(points.map(pt => [pointToId(pt), '..']));
    var openPoints = new Map(points.map(pt => [pointToId(pt), pt.z]));

    return {
        pointMap,
        points,
        availablePieces: pieces.shallowCopy(),
        openPoints,
        mins,
        zCounts: [12, 31, 7],
        maxes
    }
}

function getBoardString(board){
    if (board.board) {
        if (!board.isValid) return 'invalid';
        board = board.board;
    }
    var str = '';
    for (var y = board.mins.y ; y <= board.maxes.y; y ++){
        for (var x = board.mins.x ; x <= board.maxes.x ; x ++){
            var id = pointToId([x, y]);
            str += (board.pointMap.has(id) ? board.pointMap.get(id) : '  ') + ' '
        }
        str += '\n';
    }
    return str;
}


function getMinMax(points){
    var mins = [999, 999]; // or other huge numbers.
    var maxes = [-999, -888];
    for (var i = 0 ; i < points.length; i ++) {
        mins.x = points[i].x < mins.x ? points[i].x : mins.x;
        mins.y = points[i].y < mins.y ? points[i].y : mins.y;
        maxes.x = points[i].x > maxes.x ? points[i].x : maxes.x;
        maxes.y = points[i].y > maxes.y ? points[i].y : maxes.y;
    }
    return {mins, maxes}
}


function createPieceOrientations(name, pieceId, points){

    /* Because chris is paranoid, there is no assurance that the given piece points are zero-based.
     * So step 1 is to zero-base the points.
     * There is re-assignment to the points array. I thought it'd dodge bugs later.
     */
    const firstPoint = points[0];
    points = points.map(point => [point.x - firstPoint.x, point.y - firstPoint.y]);

    /* For math operations later, it'll be helpful to have the min/max x/y
     * 
     */
    // var mins = [999, 999]; // or other huge numbers.
    // var maxes = [-999, -888];
    // for (var i = 0 ; i < points.length; i ++) {
    //     mins.x = points[i].x < mins.x ? points[i].x : mins.x;
    //     mins.y = points[i].y < mins.y ? points[i].y : mins.y;
    //     maxes.x = points[i].x > maxes.x ? points[i].x : maxes.x;
    //     maxes.y = points[i].y > maxes.y ? points[i].y : maxes.y;
    // }
    const {mins, maxes} = getMinMax(points);



    function flipX(points){
        return points.map(point => [ maxes.x - point.x, point.y ]);
    }
    function flipY(points){
        return points.map(point => [ point.x, maxes.y - point.y ]);
    }
    function rotate(points, deg){
        if (deg % 90 != 0) console.error('only degrees of 90 are supported :(', deg);

        var d2r = (d) => d == 0 ? 0 : (d == 90 ? 1 : (d == 180 ? 0 : (d == 270 ? -1 : 0)))
        const s = d2r(deg);
        const c = d2r((deg + 90) % 360);

        var x = (pt) => Math.floor(pt.x * c + pt.y * s)
        var y = (pt) => Math.floor(pt.y * c - pt.x * s)
        var r = (pt => [
            x(pt),
            y(pt)
        ])

        return points.map(r);
    }

    let variantCount = 1;
    function create(flippedX, flippedY, rotation){
        // store as a map from (x,y) -> yes/no?
        var orientationPoints = points.map(_ => _); // simple copy.

        if (flippedX){
            orientationPoints = flipX(orientationPoints);
        }
        if (flippedY){
            orientationPoints = flipY(orientationPoints);
        }
        orientationPoints = rotate(orientationPoints, rotation);
       

        var rotatedMinMaxes = getMinMax(orientationPoints);
        orientationPoints = orientationPoints.map(p => [p.x + rotatedMinMaxes.mins.x, p.y + rotatedMinMaxes.mins.y]);
        rotatedMinMaxes = getMinMax(orientationPoints);

        var firstPoint = rotatedMinMaxes.maxes;
        orientationPoints = orientationPoints.map(point => [firstPoint.x - point.x, firstPoint.y - point.y])
        rotatedMinMaxes = getMinMax(orientationPoints);

        var set = new Set(orientationPoints.map(pointToId));
        orientationPoints.sort();
        var pointKey = JSON.stringify(orientationPoints);
        return {
            name, 
            pieceId, 
            id: pieceId + (variantCount++),
            points: orientationPoints, 
            mins: rotatedMinMaxes.mins,
            maxes: rotatedMinMaxes.maxes,
            flippedX,
            flippedY,
            rotation,
            set: set,
            hasPoint: point => set.has(pointToId(point)),
            pointKey,
        }
    }
    /* to generate all pieces, we need to flip the piece on the x axis, and flip it on the y axis. 
     * for each flip, we need to rotate the piece 4 times. Therefore, there are potentially 2*4 + 2*4 = 16 possible 
     * piece orientations per raw piece. 
     * But! 
     * There will absolutely be duplicates in there, so we need to also de-dupe the returned set of orientations.
     */

    function all4Rotations(flipX, flipY) {
        return [
            create(flipX, flipY, 0),
            create(flipX, flipY, 90),
            create(flipX, flipY, 180),
         
            create(flipX, flipY, 270),
        ]
    }
    
 
    var allPossible = [ ...all4Rotations(false, false), ...all4Rotations(true, false), ...all4Rotations(false, true), ...all4Rotations(true, true),  ]

    // get unique orientations based on the set.
    const result = [];
    const map = new Map();
    for (const item of allPossible) {
        if(!map.has(item.pointKey)){
            map.set(item.pointKey, true);    // set any value to Map
            result.push(item)
        }
    }
    return result;
}

function pieceToString(piece){
    var str = ''; 
    for (var y = piece.mins.y; y <= piece.maxes.y; y ++){
        for (var x = piece.mins.x; x <= piece.maxes.x; x ++){
            str += piece.hasPoint([x,y]) ? 'X' : '_'
        }
        str += '\n';
    }

    return str;
}

function pointToId(point) {
    // in our little world, lets assume we only need to represent numbers from -64, to 64, squared.
    return point.x + point.y * (128*2+1); // more than 64*2... Lets go bug, and give ourselves -128 to 128
}

function proveCoordIdsAreUnique(){
    var set = new Set();
    for (var x = -64; x <= 64; x ++){
        for (var y = -64; y <= 64; y ++){
            var id = pointToId([x, y]);
            if (set.has(id)){
                console.error("COORD IDS ARE NOT CORRECT! overlapped with", x, y, id);
                return false;
            }
            set.add(id);
        }
    }
    return true;
}