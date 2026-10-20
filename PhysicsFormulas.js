const PhysicsFormulas = {
    Constants: {
        EPSILON_0: 8.8541878128e-12,
        MU_0: 1.25663706212e-6,
        ELEMENTARY_CHARGE: 1.602176634e-19,
        R: 8.314462618,
        BOLTZMANN: 1.380649e-23
    },
    Utils: {
        Complex: class {
            constructor(real, imag = 0) {
                this.real = real;
                this.imag = imag;
            }
            magnitude() { return Math.sqrt(this.real * this.real + this.imag * this.imag); }
            phase() { return Math.atan2(this.imag, this.real); }
            add(c) { return new PhysicsFormulas.Utils.Complex(this.real + c.real, this.imag + c.imag); }
            sub(c) { return new PhysicsFormulas.Utils.Complex(this.real - c.real, this.imag - c.imag); }
            multiply(c) {
                return new PhysicsFormulas.Utils.Complex(
                    this.real * c.real - this.imag * c.imag,
                    this.real * c.imag + this.imag * c.real
                );
            }
            divide(c) {
                const denom = c.real * c.real + c.imag * c.imag;
                if (denom === 0) throw new Error("Division by zero.");
                return new PhysicsFormulas.Utils.Complex(
                    (this.real * c.real + this.imag * c.imag) / denom,
                    (this.imag * c.real - this.real * c.imag) / denom
                );
            }
            static fromPolar(mag, phaseRad) {
                return new PhysicsFormulas.Utils.Complex(mag * Math.cos(phaseRad), mag * Math.sin(phaseRad));
            }
        },
        Vector3D: class {
            constructor(x = 0, y = 0, z = 0) {
                this.x = x; this.y = y; this.z = z;
            }
            add(v) { return new PhysicsFormulas.Utils.Vector3D(this.x + v.x, this.y + v.y, this.z + v.z); }
            sub(v) { return new PhysicsFormulas.Utils.Vector3D(this.x - v.x, this.y - v.y, this.z - v.z); }
            scale(s) { return new PhysicsFormulas.Utils.Vector3D(this.x * s, this.y * s, this.z * s); }
            dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
            cross(v) {
                return new PhysicsFormulas.Utils.Vector3D(
                    this.y * v.z - this.z * v.y,
                    this.z * v.x - this.x * v.z,
                    this.x * v.y - this.y * v.x
                );
            }
            magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
            normalize() {
                const mag = this.magnitude();
                return mag === 0 ? new PhysicsFormulas.Utils.Vector3D() : this.scale(1 / mag);
            }
        },
        Units: {
            temperature: { C: (v) => v + 273.15, F: (v) => (v - 32) * 5/9 + 273.15, K: (v) => v },
            prefix: { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, c: 1e-2, k: 1e3, M: 1e6, G: 1e9 },
            toBase(value, prefix) { return value * (this.prefix[prefix] || 1); },
            fromBase(value, prefix) { return value / (this.prefix[prefix] || 1); }
        }
    },
    Electricity: {
        coulombsLaw(q1, q2, r) {
            const k = 1 / (4 * Math.PI * PhysicsFormulas.Constants.EPSILON_0);
            return k * Math.abs(q1 * q2) / (r * r);
        },
        electricFieldVector(sourceCharge, sourcePos, targetPos) {
            const rVec = targetPos.sub(sourcePos);
            const rMag = rVec.magnitude();
            if (rMag === 0) throw new Error("Division by zero.");
            const k = 1 / (4 * Math.PI * PhysicsFormulas.Constants.EPSILON_0);
            return rVec.normalize().scale((k * sourceCharge) / (rMag * rMag));
        },
        ohmsLaw: {
            voltage(i, r) { return i * r; },
            current(v, r) { return v / r; },
            resistance(v, i) { return v / i; }
        },
        ac: {
            capacitiveReactance(f, c) { return 1 / (2 * Math.PI * f * c); },
            inductiveReactance(f, l) { return 2 * Math.PI * f * l; },
            rlcImpedancePhasor(r, l, c, f) {
                const xl = 2 * Math.PI * f * l;
                const xc = 1 / (2 * Math.PI * f * c);
                return new PhysicsFormulas.Utils.Complex(r, xl - xc);
            }
        }
    },
    Magnetism: {
        lorentzForce(charge, eFieldVec, velocityVec, bFieldVec) {
            return eFieldVec.add(velocityVec.cross(bFieldVec)).scale(charge);
        },
        magneticForceOnWireVector(current, lengthVec, bFieldVec) {
            return lengthVec.cross(bFieldVec).scale(current);
        },
        bFieldStraightWire(current, r) {
            return (PhysicsFormulas.Constants.MU_0 * current) / (2 * Math.PI * r);
        }
    },
    Thermodynamics: {
        idealGasPressure(n, tKelvin, volume) {
            return (n * PhysicsFormulas.Constants.R * tKelvin) / volume;
        },
        heatTransfer(m, c, deltaT) { return m * c * deltaT; },
        carnotEfficiency(tc, th) { return 1 - (tc / th); }
    }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = PhysicsFormulas; }