var cars;
var prevKey = ' ';
var field;
var path;
var debug = false;
var wallDist = 25;

function setup() {
    randomSeed(13);
    let myCanvas = createCanvas(600, 400);
    myCanvas.parent('container');
    cars = [];
    cars.push(new Car(createVector(0, height / 2), 2, 0.04));
    cars.push(new Car(createVector(0, height / 2), 3, 0.1));
    field = new FlowField();
    newPath();
}
function newPath() {
    path = new Path();
    let angle = TWO_PI / 5;
    let x = width / 2;
    let y = height / 2;
    for (let a = 0; a < TWO_PI; a += angle) {
        let sx = x + cos(a) * 150;
        let sy = y + sin(a) * 120;
        path.addPoint(createVector(sx, sy));
    }
    path.addPoint(path.points[0]);
}

function drawWalls() {
    stroke(175);
    noFill();
    rectMode(CENTER);
    rect(width / 2, height / 2, width - wallDist * 2, height - wallDist * 2);
}

function drawMouse() {
    let mouse = new createVector(mouseX, mouseY);
    fill(50);
    stroke(0);
    strokeWeight(2);
    ellipse(mouse.x, mouse.y, 20, 20);
    return mouse;
}

function seekSteering() {
    let mouse = drawMouse();
    for (let i = 0; i < cars.length; i ++) {
        cars[i].seek(mouse);
        cars[i].run();
    }  
}

function fleeSteering() {
    let mouse = drawMouse();
    for (let i = 0; i < cars.length; i ++) {
        cars[i].flee(mouse);
        cars[i].run();
    }
}

function arriveSteering() {
    let mouse = drawMouse();
    for (let i = 0; i < cars.length; i ++) {
        cars[i].arrive(mouse);
        cars[i].run();
    }
}

function avoidWallSteering() {
    drawWalls();
    for (let i = 0; i < cars.length; i ++) {
        cars[i].avoidWall();
        cars[i].run();
    }
}

function followFlowField() {
    for (let i = 0; i < cars.length; i ++) {
        cars[i].followField(field);
        cars[i].run();
    }
}

function followPath() {
    path.display();
    for (let i = 0; i < cars.length; i ++) {
        cars[i].followPath(path);
        cars[i].run();
    }
}

function draw() {
    background(200);
    if (key == '1') {
        seekSteering();
        prevKey = key;
    } else if (key == '2') {
        fleeSteering();
        prevKey = key;
    } else if (key == '3') {
        arriveSteering();
        prevKey = key;
    } else if (key == '4') {
        if (prevKey != key) {
            for (let i = 0; i < cars.length; i ++) {
                cars[i].resetVelocity();
            }
        }
        avoidWallSteering();
        prevKey = key;
    } else if (key == '5') {
        followFlowField();
        prevKey = key;
    } else {
        followPath();
        prevKey = key;
    }
}

function keyPressed() {
    if (key == ' ') {
        debug = !debug;
    }
}

class Car {

    constructor(loc, ms, mf) {
        this.location = loc;
        this.maxSpeed = ms;
        this.maxForce = mf;
        this.r = 4;
        this.velocity = createVector(random(0, this.maxSpeed), random(0, this.maxSpeed));
        this.acceleration = createVector(0, 0);
        this.onPath = false;
    }
    
    resetVelocity() {
        this.velocity = createVector(random(0, this.maxSpeed), random(0, this.maxSpeed));
    }
    
    // Seek steering
    seek(target) {
        let desired = p5.Vector.sub(target, this.location);
        desired.normalize().mult(this.maxSpeed);
        this.steering(desired);
    }
    
    // Flee steering
    flee(target) {
        let desired = p5.Vector.sub(this.location, target);
        desired.normalize().mult(this.maxSpeed);
        this.steering(desired);
    }
    
    // Arrive steering
    arrive(target) {
        let desired = p5.Vector.sub(target, this.location);
        let d = desired.mag();
        desired.normalize();
        if (d < 20) {
            let m = map(d, 0, 20, 0, this.maxSpeed);
            desired.mult(m);
        } else {
            desired.mult(this.maxSpeed);
        }
        this.steering(desired);
    }
    
    // Avoid walls steering
    avoidWall() {
        let desired = null;

        if (this.location.x < wallDist) {
            desired = createVector(this.maxSpeed, this.velocity.y);
        } else if (this.location.x > width - wallDist) {
            desired = createVector(-this.maxSpeed, this.velocity.y);
        }
        if (this.location.y < wallDist) {
            desired = createVector(this.velocity.x, this.maxSpeed);
        } else if (this.location.y > height - wallDist) {
            desired = createVector(this.velocity.x, -this.maxSpeed);
        }
        if (desired !== null) {
            desired.normalize().mult(this.maxSpeed);
            this.steering(desired);
        }
    }
    
    // flow-field following
    followField(flow) {
        let desired = flow.lookup(this.location);
        desired.mult(this.maxSpeed);
        this.steering(desired);
    }
    
    followPath(path) {
        let predict = this.velocity.copy();
        predict.normalize().mult(20);
        let predictLoc = p5.Vector.add(this.location, predict);
        let direction = null;
        let normalPt = null;
        let target = null;
        let record = 1000000;
        for (let i = 0; i < path.points.length - 1; i++) {
            let a = path.points[i];
            let b = path.points[i+1];
            let predictProjectedPt = this.getProjectedPt(predictLoc, a, b);

            if ((predictProjectedPt.x < min(a.x, b.x) || predictProjectedPt.x > max(a.x, b.x))
                  || ((predictProjectedPt.x >= min(a.x, b.x) && predictProjectedPt.x <= max(a.x, b.x) 
                  && (predictProjectedPt.y < min(a.y, b.y) || predictProjectedPt.y > max(a.y, b.y))))) {
                if (predictProjectedPt.dist(a) > predictProjectedPt.dist(b)) {
                    predictProjectedPt = b.copy();
                } else {
                    predictProjectedPt = a.copy();
                }
            }
            let distance = predictProjectedPt.dist(predictLoc);
            if (distance < record) {
                record = distance;
                normalPt = predictProjectedPt.copy();
                let ab = p5.Vector.sub(b, a);
                let ba = p5.Vector.sub(a, b);
                if (p5.Vector.sub(normalPt, this.location).dot(ab) >= 0) {
                    direction = ab;
                } else {
                    direction = ba;
                }
                direction.normalize().mult(10);
                target = normalPt.copy();
                target.add(direction);
            }
        }
        if (!this.onPath && record < path.radius) {
            this.onPath = true;
        }
        if (record > path.radius - 5) {
            if (this.onPath) {
                this.velocity.div(1.3);
            }
            this.seek(target);
        }
        if (this.velocity.mag() < 0.7) {
            this.velocity.mult(1.5);
        }

        if (debug) {
            stroke(0);
            fill(0);
            line(this.location.x, this.location.y, predictLoc.x, predictLoc.y);
            ellipse(predictLoc.x, predictLoc.y, 4, 4);

            // Draw normal location
            stroke(0);
            fill(0);
            ellipse(normalPt.x, normalPt.y, 4, 4);

            // Draw actual target (red if steering towards it)
            line(predictLoc.x, predictLoc.y, normalPt.x, normalPt.y);
            if (record > path.radius)
                fill(255, 0, 0);
            noStroke();
            ellipse(target.x, target.y, 8, 8);
        }
    }
    
    getProjectedPt(p, a, b) {
        let ap = p5.Vector.sub(p, a);
        let ab = p5.Vector.sub(b, a);
        ab.normalize();
        ab.mult(ap.dot(ab));
        let projPt = p5.Vector.add(a, ab);
        return projPt;
    }
    
    steering(desired) {
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        this.applyForce(steer);
    }
    
    applyForce(force) {
        this.acceleration.add(force);
    }
    
    run() {
        this.update();
        this.display();
    }
    
    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.location.add(this.velocity);
        this.acceleration.mult(0);
    }
    
    display() {
        let theta = this.velocity.heading() + PI / 2;
        fill(127);
        stroke(0);
        strokeWeight(2);
        push();
        translate(this.location.x, this.location.y);
        rotate(theta);
        beginShape(TRIANGLES);
        vertex(0, -this.r * 2);
        vertex(-this.r, this.r * 2);
        vertex(this.r, this.r * 2);
        endShape();
        pop();
    }
}

class FlowField {

    constructor() {
        this.resolution = 10;
        this.cols = width / this.resolution;
        this.rows = height / this.resolution;
        this.initField();
    }

    initField() {
        this.field = [];
        let xoff = 0;
        for (let i = 0; i  < this.cols; i++) {
            this.field.push([]);
            let yoff = 0;
            for (let j = 0; j < this.rows; j++) {
                let theta = map(noise(xoff, yoff), 0, 1, 0, TWO_PI);
                this.field[i].push(createVector(cos(theta), sin(theta)));
                yoff += 0.1;
            }
            xoff += 0.1;
        }
    }

    lookup(lookup) {
        let col = int(constrain(lookup.x / this.resolution, 0, this.cols - 1));
        let row = int(constrain(lookup.y / this.resolution, 0, this.rows - 1));
        return this.field[col][row].copy();
    }
}

class Path {
  
    constructor() {
        this.radius = 30;
        this.points = [];
    }
  
    addPoint(point) {
        this.points.push(point);
    }
  
    display() {
        push();
        for (let i = 0; i < this.points.length - 1; i++) {
            strokeWeight(this.radius * 2);
            stroke(120);
            line(this.points[i].x, this.points[i].y, this.points[i+1].x, this.points[i+1].y);
        }
        for (let i = 0; i < this.points.length - 1; i++) {
            strokeWeight(3);
            stroke(255);
            this.setLineDash([5, 5])
            line(this.points[i].x, this.points[i].y, this.points[i+1].x, this.points[i+1].y);
        }
        pop();
    }

    setLineDash(list) {
        drawingContext.setLineDash(list);
    }
}
