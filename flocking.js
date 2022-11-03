var flock;

function setup() {
    randomSeed(0);
    let myCanvas = createCanvas(640, 540);
    myCanvas.parent('myContainer');
    flock = new Flock();
    let n = 100;
    for (let i = 0; i < n; i++) {
        flock.addBoid(new Boid(width / 2, height / 2));
    }
}

function draw() {
    background(200);
    flock.run();
}

class Boid {
    
    constructor(x, y) {
        this.location = createVector(x, y);
        this.maxSpeed = 3;
        this.maxForce = 0.05;
        this.radius = 4;
        this.velocity = p5.Vector.random2D().setMag(this.maxSpeed);
        this.acceleration = createVector();
    }
    
    seek(target) {
        let desired = p5.Vector.sub(target, this.location);
        desired.setMag(this.maxSpeed);
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }
    
    separate(boids) {
        let separateRadius = this.radius * 2;
        let count = 0;
        let sum = createVector();
        for (let i = 0; i < boids.length; i++) {
            let distance = this.location.dist(boids[i].location);
            if (distance > 0 && distance < separateRadius) {
                count++;
                let diff = p5.Vector.sub(this.location, boids[i].location);
                diff.normalize().div(distance);
                sum.add(diff);
            }
        }
        if (count > 0) {
            sum.div(count);
            sum.setMag(this.maxSpeed);
            sum.sub(this.velocity);
            sum.limit(this.maxForce);
        }
        return sum;
    }
    
    cohesion(boids) {
        let neighborRadius = 50;
        let count = 0;
        let sum = createVector();
        for (let i = 0; i < boids.length; i++) {
            let distance = this.location.dist(boids[i].location);
            if (distance > neighborRadius && distance > 0) {
                count++;
                sum.add(boids[i].location);
            }
        }
        if (count > 0) {
            sum.div(count);
        }
        return this.seek(sum);
    }
    
    align(boids) {
        let neighborRadius = 50;
        let count = 0;
        let sum = createVector();
        for (let i = 0; i < boids.length; i++) {
            var distance = this.location.dist(boids[i].location);
            if (distance < neighborRadius) {
                count++;
                sum.add(boids[i].velocity);
            }
        }
        if (count > 0) {
            sum.div(boids.length);
            sum.setMag(this.maxSpeed);
            sum.sub(this.velocity);
            sum.limit(this.maxForce);
        }
        return sum;
    }
    
    flock(boids) {
        let separate = this.separate(boids);
        let align = this.align(boids);
        let cohesion = this.cohesion(boids);
        separate.mult(2.5);
        align.mult(1);
        cohesion.mult(1);
        this.applyForce(separate);
        this.applyForce(align);
        this.applyForce(cohesion);
    }
    
    applyForce(force) {
        this.acceleration.add(force);
    }
    
    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.location.add(this.velocity);
        this.acceleration.mult(0);
    }
    
    display() {
        fill(175);
        let theta = this.velocity.heading() + PI / 2;
        push();
        translate(this.location.x, this.location.y);
        rotate(theta);
        beginShape(TRIANGLES);
        vertex(0, -this.radius * 2);
        vertex(-this.radius, this.radius * 2);
        vertex(this.radius, this.radius * 2);
        endShape();
        pop();
    }
    
    borders() {
        if (this.location.x < -this.radius)
            this.location.x = width + this.radius;
        if (this.location.y < -this.radius)
            this.location.y = height + this.radius;
        if (this.location.x > width + this.radius)
            this.location.x = -this.radius;
        if (this.location.y > height + this.radius)
            this.location.y = -this.radius;
    }
    
    run(boids) {
        this.flock(boids);
        this.update();
        this.borders();
        this.display();
    }
}

class Flock {
    
    constructor() {
        this.boids = [];
    }
    
    run() {
        for (let i = 0; i < this.boids.length; i++) {
            this.boids[i].run(this.boids);
        }
    }
    
    addBoid(b) {
        this.boids.push(b);
    }
    
}
