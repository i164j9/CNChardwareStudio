/**
 * CncHardwareMath - Comprehensive CNC Engineering Formula Library
 * Covers Kinematics, Electrical, Mechanical, Stepper, and Servo Dynamics.
 * Calculations use metric units; conversion helpers support common imperial units.
 */
function calculateStraightnessErrorUm(measurementLengthMm, readingsUm) {
  if (!Number.isFinite(measurementLengthMm) || measurementLengthMm <= 0) {
    throw new RangeError("Measurement length must be a positive number of millimeters.");
  }
  if (
    !Array.isArray(readingsUm) ||
    readingsUm.length < 3 ||
    readingsUm.some((reading) => !Number.isFinite(reading))
  ) {
    throw new RangeError(
      "Enter at least three valid straightness readings, including both ends and at least one point in between.",
    );
  }

  const firstReading = readingsUm[0];
  const lastReading = readingsUm[readingsUm.length - 1];
  let minimumDeviation = Infinity;
  let maximumDeviation = -Infinity;

  readingsUm.forEach((reading, index) => {
    const straightReference =
      firstReading + ((lastReading - firstReading) * index) / (readingsUm.length - 1);
    const deviation = reading - straightReference;
    minimumDeviation = Math.min(minimumDeviation, deviation);
    maximumDeviation = Math.max(maximumDeviation, deviation);
  });

  return maximumDeviation - minimumDeviation;
}

const CncHardwareMath = {
  // ==========================================================================
  // 1. KINEMATICS & DRIVE RESOLUTION (STEPS / COUNTS PER UNIT)
  // ==========================================================================

  /**
   * Calculates Stepper Steps/mm for a Belt-Driven Lead Screw or Ball Screw.
   * For direct drive, set driveTeeth and drivenTeeth to 1.
   */
  stepperScrewStepsPerMm(
    motorSteps,
    microstepping,
    driveTeeth,
    drivenTeeth,
    screwLead,
  ) {
    const pulsesPerMotorRev = motorSteps * microstepping;
    const gearRatio = drivenTeeth / driveTeeth; // >1 means reduction (torque boost)
    return (pulsesPerMotorRev * gearRatio) / screwLead;
  },

  /**
   * Calculates Stepper Steps/mm for a Direct-Drive Lead Screw or Ball Screw.
   */
  stepperDirectScrewStepsPerMm(motorSteps, microstepping, screwLead) {
    return (motorSteps * microstepping) / screwLead;
  },

  /**
   * Calculates Stepper Steps/mm for a Pure Belt Drive (e.g., Rack & Pinion or Pulley-to-Belt).
   */
  stepperPureBeltStepsPerMm(motorSteps, microstepping, beltPitch, pulleyTeeth) {
    const pulsesPerMotorRev = motorSteps * microstepping;
    const mmPerMotorRev = beltPitch * pulleyTeeth;
    return pulsesPerMotorRev / mmPerMotorRev;
  },

  /**
   * Calculates Servo Quadrature Counts per mm (Encoder Counts/mm) for a Lead Screw.
   * @param {number} encoderPpr - Pulses Per Revolution (Lines). Quadrature multiplier is 4x.
   */
  servoScrewCountsPerMm(encoderPpr, driveTeeth, drivenTeeth, screwLead) {
    const countsPerMotorRev = encoderPpr * 4; // 4x decoding for standard quadrature
    const gearRatio = drivenTeeth / driveTeeth;
    return (countsPerMotorRev * gearRatio) / screwLead;
  },

  /**
   * Calculates Servo Quadrature Counts/mm for a Direct-Drive Lead Screw or Ball Screw.
   */
  servoDirectScrewCountsPerMm(encoderPpr, screwLead) {
    return (encoderPpr * 4) / screwLead;
  },

  /**
   * Calculates the exact Achievable Mechanical Resolution (Linear movement per step/count).
   * @returns {number} Resolution in mm/step or mm/count. Values > 0.01mm might lack accuracy for milling.
   */
  getMechanicalResolution(stepsOrCountsPerMm) {
    if (stepsOrCountsPerMm === 0) return 0;
    return 1 / stepsOrCountsPerMm;
  },

  // ==========================================================================
  // 2. POWER ELECTRONICS & POWER SUPPLY SIZING
  // ==========================================================================

  /**
   * Estimates the Ideal Maximum Target Voltage for a Stepper Motor based on coil inductance.
   * Exceeding this value risks blowing the stepper driver; undersizing hurts high-speed torque.
   * @param {number} inductanceMh - Motor phase inductance in millihenries (mH).
   */
  stepperMaxTargetVoltage(inductanceMh) {
    return 32 * Math.sqrt(inductanceMh);
  },

  /**
   * Applies a rough 70% concurrency factor to estimated supply-side motor currents.
   * This does not convert stepper phase current to PSU current; use
   * estimateDcSupplyCurrent with component power/current ratings for a more explicit estimate.
   * @param {number} maxCurrentPerMotor - Estimated supply-side current per motor (Amps).
   * @param {number} totalMotors - Total number of axes/motors sharing the supply.
   */
  estimateTotalPsuCurrent(maxCurrentPerMotor, totalMotors) {
    return maxCurrentPerMotor * totalMotors * 0.7;
  },

  /**
   * Calculates DC load current from power and voltage.
   */
  dcCurrentFromPower(powerWatts, voltage) {
    if (
      !Number.isFinite(powerWatts) ||
      powerWatts < 0 ||
      !Number.isFinite(voltage) ||
      voltage <= 0
    ) {
      throw new RangeError(
        "Power must be non-negative and voltage must be positive.",
      );
    }
    return powerWatts / voltage;
  },

  /**
   * Calculates current from voltage and resistance using Ohm's law.
   */
  currentFromVoltageAndResistance(voltage, resistanceOhms) {
    if (
      !Number.isFinite(voltage) ||
      !Number.isFinite(resistanceOhms) ||
      resistanceOhms <= 0
    ) {
      throw new RangeError(
        "Voltage must be finite and resistance must be positive.",
      );
    }
    return voltage / resistanceOhms;
  },

  /**
   * Calculates single-phase AC current from real power, voltage, and power factor.
   */
  singlePhaseAcCurrent(powerWatts, voltage, powerFactor = 1) {
    if (
      !Number.isFinite(powerWatts) ||
      powerWatts < 0 ||
      !Number.isFinite(voltage) ||
      voltage <= 0 ||
      !Number.isFinite(powerFactor) ||
      powerFactor <= 0 ||
      powerFactor > 1
    ) {
      throw new RangeError(
        "Power must be non-negative; voltage must be positive; power factor must be in (0, 1].",
      );
    }
    return powerWatts / (voltage * powerFactor);
  },

  /**
   * Calculates balanced three-phase AC line current from real power.
   */
  threePhaseAcCurrent(powerWatts, lineVoltage, powerFactor = 1) {
    if (
      !Number.isFinite(powerWatts) ||
      powerWatts < 0 ||
      !Number.isFinite(lineVoltage) ||
      lineVoltage <= 0 ||
      !Number.isFinite(powerFactor) ||
      powerFactor <= 0 ||
      powerFactor > 1
    ) {
      throw new RangeError(
        "Power must be non-negative; line voltage must be positive; power factor must be in (0, 1].",
      );
    }
    return powerWatts / (Math.sqrt(3) * lineVoltage * powerFactor);
  },

  /**
   * Converts sinusoidal AC RMS voltage to peak voltage.
   */
  acRmsVoltageToPeak(voltageRms) {
    if (!Number.isFinite(voltageRms) || voltageRms < 0) {
      throw new RangeError("RMS voltage must be finite and non-negative.");
    }
    return voltageRms * Math.SQRT2;
  },

  /**
   * Converts sinusoidal AC peak voltage to RMS voltage.
   */
  acPeakVoltageToRms(voltagePeak) {
    if (!Number.isFinite(voltagePeak) || voltagePeak < 0) {
      throw new RangeError("Peak voltage must be finite and non-negative.");
    }
    return voltagePeak / Math.SQRT2;
  },

  /**
   * Converts sinusoidal AC RMS current to peak current.
   */
  acRmsCurrentToPeak(currentRms) {
    if (!Number.isFinite(currentRms) || currentRms < 0) {
      throw new RangeError("RMS current must be finite and non-negative.");
    }
    return currentRms * Math.SQRT2;
  },

  /**
   * Converts sinusoidal AC peak current to RMS current.
   */
  acPeakCurrentToRms(currentPeak) {
    if (!Number.isFinite(currentPeak) || currentPeak < 0) {
      throw new RangeError("Peak current must be finite and non-negative.");
    }
    return currentPeak / Math.SQRT2;
  },

  /**
   * Calculates single-phase apparent power using RMS voltage and current (VA).
   */
  singlePhaseAcApparentPower(voltageRms, currentRms) {
    if (
      !Number.isFinite(voltageRms) ||
      voltageRms < 0 ||
      !Number.isFinite(currentRms) ||
      currentRms < 0
    ) {
      throw new RangeError("RMS voltage and current must be non-negative.");
    }
    return voltageRms * currentRms;
  },

  /**
   * Calculates balanced three-phase apparent power using line RMS values (VA).
   */
  threePhaseAcApparentPower(lineVoltageRms, lineCurrentRms) {
    if (
      !Number.isFinite(lineVoltageRms) ||
      lineVoltageRms < 0 ||
      !Number.isFinite(lineCurrentRms) ||
      lineCurrentRms < 0
    ) {
      throw new RangeError("RMS line voltage and current must be non-negative.");
    }
    return Math.sqrt(3) * lineVoltageRms * lineCurrentRms;
  },

  /**
   * Calculates single-phase real power from RMS values and power factor (W).
   */
  singlePhaseAcRealPower(voltageRms, currentRms, powerFactor) {
    if (
      !Number.isFinite(voltageRms) ||
      voltageRms < 0 ||
      !Number.isFinite(currentRms) ||
      currentRms < 0 ||
      !Number.isFinite(powerFactor) ||
      powerFactor < 0 ||
      powerFactor > 1
    ) {
      throw new RangeError(
        "RMS voltage and current must be non-negative; power factor must be in [0, 1].",
      );
    }
    return voltageRms * currentRms * powerFactor;
  },

  /**
   * Calculates balanced three-phase real power from line RMS values and power factor (W).
   */
  threePhaseAcRealPower(lineVoltageRms, lineCurrentRms, powerFactor) {
    if (
      !Number.isFinite(lineVoltageRms) ||
      lineVoltageRms < 0 ||
      !Number.isFinite(lineCurrentRms) ||
      lineCurrentRms < 0 ||
      !Number.isFinite(powerFactor) ||
      powerFactor < 0 ||
      powerFactor > 1
    ) {
      throw new RangeError(
        "RMS line voltage and current must be non-negative; power factor must be in [0, 1].",
      );
    }
    return Math.sqrt(3) * lineVoltageRms * lineCurrentRms * powerFactor;
  },

  /**
   * Calculates single-phase reactive power magnitude from RMS values and power factor (var).
   * The result does not indicate whether the load is inductive or capacitive.
   */
  singlePhaseAcReactivePower(voltageRms, currentRms, powerFactor) {
    if (
      !Number.isFinite(voltageRms) ||
      voltageRms < 0 ||
      !Number.isFinite(currentRms) ||
      currentRms < 0 ||
      !Number.isFinite(powerFactor) ||
      powerFactor < 0 ||
      powerFactor > 1
    ) {
      throw new RangeError(
        "RMS voltage and current must be non-negative; power factor must be in [0, 1].",
      );
    }
    return voltageRms * currentRms * Math.sqrt(1 - powerFactor ** 2);
  },

  /**
   * Calculates balanced three-phase reactive power magnitude (var).
   * The result does not indicate whether the load is inductive or capacitive.
   */
  threePhaseAcReactivePower(lineVoltageRms, lineCurrentRms, powerFactor) {
    if (
      !Number.isFinite(lineVoltageRms) ||
      lineVoltageRms < 0 ||
      !Number.isFinite(lineCurrentRms) ||
      lineCurrentRms < 0 ||
      !Number.isFinite(powerFactor) ||
      powerFactor < 0 ||
      powerFactor > 1
    ) {
      throw new RangeError(
        "RMS line voltage and current must be non-negative; power factor must be in [0, 1].",
      );
    }
    return (
      Math.sqrt(3) *
      lineVoltageRms *
      lineCurrentRms *
      Math.sqrt(1 - powerFactor ** 2)
    );
  },

  /**
   * Calculates single-phase power factor from real power and RMS voltage/current.
   */
  singlePhaseAcPowerFactor(realPowerWatts, voltageRms, currentRms) {
    if (
      !Number.isFinite(realPowerWatts) ||
      realPowerWatts < 0 ||
      !Number.isFinite(voltageRms) ||
      voltageRms <= 0 ||
      !Number.isFinite(currentRms) ||
      currentRms <= 0
    ) {
      throw new RangeError(
        "Real power must be non-negative and RMS voltage and current must be positive.",
      );
    }
    const powerFactor = realPowerWatts / (voltageRms * currentRms);
    if (powerFactor > 1) {
      throw new RangeError("Real power cannot exceed apparent power.");
    }
    return powerFactor;
  },

  /**
   * Calculates balanced three-phase power factor from real power and RMS line values.
   */
  threePhaseAcPowerFactor(realPowerWatts, lineVoltageRms, lineCurrentRms) {
    if (
      !Number.isFinite(realPowerWatts) ||
      realPowerWatts < 0 ||
      !Number.isFinite(lineVoltageRms) ||
      lineVoltageRms <= 0 ||
      !Number.isFinite(lineCurrentRms) ||
      lineCurrentRms <= 0
    ) {
      throw new RangeError(
        "Real power must be non-negative and RMS line voltage and current must be positive.",
      );
    }
    const powerFactor =
      realPowerWatts / (Math.sqrt(3) * lineVoltageRms * lineCurrentRms);
    if (powerFactor > 1) {
      throw new RangeError("Real power cannot exceed apparent power.");
    }
    return powerFactor;
  },

  /**
   * Calculates series RLC impedance magnitude in ohms for a sinusoidal source.
   */
  seriesRlcImpedanceOhms(
    resistanceOhms,
    inductanceHenries,
    capacitanceFarads,
    frequencyHz,
  ) {
    if (
      !Number.isFinite(resistanceOhms) ||
      resistanceOhms < 0 ||
      !Number.isFinite(inductanceHenries) ||
      inductanceHenries < 0 ||
      !Number.isFinite(capacitanceFarads) ||
      capacitanceFarads <= 0 ||
      !Number.isFinite(frequencyHz) ||
      frequencyHz < 0
    ) {
      throw new RangeError(
        "Resistance, inductance, and frequency must be non-negative; capacitance must be positive.",
      );
    }
    const inductiveReactance = 2 * Math.PI * frequencyHz * inductanceHenries;
    const capacitiveReactance =
      frequencyHz === 0
        ? Infinity
        : 1 / (2 * Math.PI * frequencyHz * capacitanceFarads);
    return Math.hypot(resistanceOhms, inductiveReactance - capacitiveReactance);
  },

  /**
   * Calculates RMS current through an ideal series RLC load in amperes.
   */
  seriesRlcCurrentAmps(
    voltageRms,
    resistanceOhms,
    inductanceHenries,
    capacitanceFarads,
    frequencyHz,
  ) {
    if (!Number.isFinite(voltageRms) || voltageRms < 0) {
      throw new RangeError("RMS voltage must be finite and non-negative.");
    }
    const impedance = this.seriesRlcImpedanceOhms(
      resistanceOhms,
      inductanceHenries,
      capacitanceFarads,
      frequencyHz,
    );
    if (impedance === 0) {
      throw new RangeError("Current is undefined for an ideal zero-impedance circuit.");
    }
    return voltageRms / impedance;
  },

  /**
   * Calculates the power factor magnitude of a series RLC load.
   */
  seriesRlcPowerFactor(
    resistanceOhms,
    inductanceHenries,
    capacitanceFarads,
    frequencyHz,
  ) {
    const impedance = this.seriesRlcImpedanceOhms(
      resistanceOhms,
      inductanceHenries,
      capacitanceFarads,
      frequencyHz,
    );
    if (impedance === 0) {
      throw new RangeError("Power factor is undefined for an ideal zero-impedance circuit.");
    }
    return resistanceOhms / impedance;
  },

  /**
   * Calculates the series RLC phase angle in radians; positive is inductive,
   * negative is capacitive.
   */
  seriesRlcPhaseAngleRadians(
    resistanceOhms,
    inductanceHenries,
    capacitanceFarads,
    frequencyHz,
  ) {
    if (
      !Number.isFinite(resistanceOhms) ||
      resistanceOhms < 0 ||
      !Number.isFinite(inductanceHenries) ||
      inductanceHenries < 0 ||
      !Number.isFinite(capacitanceFarads) ||
      capacitanceFarads <= 0 ||
      !Number.isFinite(frequencyHz) ||
      frequencyHz < 0
    ) {
      throw new RangeError(
        "Resistance, inductance, and frequency must be non-negative; capacitance must be positive.",
      );
    }
    const inductiveReactance = 2 * Math.PI * frequencyHz * inductanceHenries;
    const capacitiveReactance =
      frequencyHz === 0
        ? Infinity
        : 1 / (2 * Math.PI * frequencyHz * capacitanceFarads);
    return Math.atan2(inductiveReactance - capacitiveReactance, resistanceOhms);
  },

  /**
   * Calculates inductor reactance in ohms. Inductance is in henries and
   * frequency is in hertz; this is the ideal component value, not parasitics.
   */
  inductiveReactanceOhms(inductanceHenries, frequencyHz) {
    if (
      !Number.isFinite(inductanceHenries) ||
      inductanceHenries < 0 ||
      !Number.isFinite(frequencyHz) ||
      frequencyHz < 0
    ) {
      throw new RangeError(
        "Inductance and frequency must be finite and non-negative.",
      );
    }
    return 2 * Math.PI * frequencyHz * inductanceHenries;
  },

  /**
   * Calculates capacitor reactance in ohms. Capacitance is in farads and
   * frequency is in hertz; zero frequency has infinite ideal reactance.
   */
  capacitiveReactanceOhms(capacitanceFarads, frequencyHz) {
    if (
      !Number.isFinite(capacitanceFarads) ||
      capacitanceFarads <= 0 ||
      !Number.isFinite(frequencyHz) ||
      frequencyHz < 0
    ) {
      throw new RangeError(
        "Capacitance must be positive and frequency must be non-negative.",
      );
    }
    if (frequencyHz === 0) return Infinity;
    return 1 / (2 * Math.PI * frequencyHz * capacitanceFarads);
  },

  /**
   * Calculates the ideal LC resonant frequency in hertz.
   */
  lcResonantFrequencyHz(inductanceHenries, capacitanceFarads) {
    if (
      !Number.isFinite(inductanceHenries) ||
      inductanceHenries <= 0 ||
      !Number.isFinite(capacitanceFarads) ||
      capacitanceFarads <= 0
    ) {
      throw new RangeError("Inductance and capacitance must be positive.");
    }
    return 1 / (2 * Math.PI * Math.sqrt(inductanceHenries * capacitanceFarads));
  },

  /**
   * Calculates energy stored in an ideal inductor in joules.
   */
  inductorEnergyJoules(inductanceHenries, currentAmps) {
    if (
      !Number.isFinite(inductanceHenries) ||
      inductanceHenries < 0 ||
      !Number.isFinite(currentAmps)
    ) {
      throw new RangeError(
        "Inductance must be non-negative and current must be finite.",
      );
    }
    return 0.5 * inductanceHenries * currentAmps ** 2;
  },

  /**
   * Calculates energy stored in an ideal capacitor in joules.
   */
  capacitorEnergyJoules(capacitanceFarads, voltage) {
    if (
      !Number.isFinite(capacitanceFarads) ||
      capacitanceFarads < 0 ||
      !Number.isFinite(voltage)
    ) {
      throw new RangeError(
        "Capacitance must be non-negative and voltage must be finite.",
      );
    }
    return 0.5 * capacitanceFarads * voltage ** 2;
  },

  /**
   * Estimates inductance from applied voltage and a measured current ramp:
   * L = V × Δt / ΔI. Assumes constant voltage and negligible resistance.
   */
  inductanceFromVoltageAndCurrentRamp(voltage, currentChangeAmps, timeSeconds) {
    if (
      !Number.isFinite(voltage) ||
      !Number.isFinite(currentChangeAmps) ||
      currentChangeAmps === 0 ||
      !Number.isFinite(timeSeconds) ||
      timeSeconds < 0
    ) {
      throw new RangeError(
        "Voltage and time must be finite, and current change must be non-zero.",
      );
    }
    return (voltage * timeSeconds) / currentChangeAmps;
  },

  /**
   * Estimates capacitance from current and a measured voltage ramp:
   * C = I × Δt / ΔV. Assumes constant current and negligible leakage.
   */
  capacitanceFromCurrentAndVoltageRamp(currentAmps, voltageChange, timeSeconds) {
    if (
      !Number.isFinite(currentAmps) ||
      !Number.isFinite(voltageChange) ||
      voltageChange === 0 ||
      !Number.isFinite(timeSeconds) ||
      timeSeconds < 0
    ) {
      throw new RangeError(
        "Current and time must be finite, and voltage change must be non-zero.",
      );
    }
    return (currentAmps * timeSeconds) / voltageChange;
  },

  /**
   * Estimates DC supply current from component power or voltage/current ratings.
   * Each load is { powerWatts, quantity? } or { voltage, currentAmps, quantity? }.
   * @param {number} supplyVoltage - DC supply output voltage.
   * @param {Array<{powerWatts?: number, voltage?: number, currentAmps?: number, quantity?: number}>} loads
   * @param {number} efficiency - PSU efficiency from greater than 0 to 1.
   */
  estimateDcSupplyCurrent(supplyVoltage, loads, efficiency = 1) {
    if (
      !Number.isFinite(supplyVoltage) ||
      supplyVoltage <= 0 ||
      !Array.isArray(loads) ||
      !Number.isFinite(efficiency) ||
      efficiency <= 0 ||
      efficiency > 1
    ) {
      throw new RangeError(
        "Supply voltage must be positive, loads must be an array, and efficiency must be in (0, 1].",
      );
    }

    const loadPowerWatts = loads.reduce((total, load) => {
      if (load === null || typeof load !== "object") {
        throw new TypeError("Each load must be an object.");
      }
      const quantity = load.quantity ?? 1;
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new RangeError("Load quantity must be positive.");
      }

      let watts;
      if (load.powerWatts !== undefined && load.voltage === undefined && load.currentAmps === undefined) {
        watts = load.powerWatts;
      } else if (
        load.powerWatts === undefined &&
        Number.isFinite(load.voltage) &&
        load.voltage > 0 &&
        Number.isFinite(load.currentAmps) &&
        load.currentAmps >= 0
      ) {
        watts = load.voltage * load.currentAmps;
      } else {
        throw new TypeError("Each load must specify powerWatts or both voltage and currentAmps.");
      }

      if (!Number.isFinite(watts) || watts < 0) {
        throw new RangeError("Load power must be finite and non-negative.");
      }
      return total + watts * quantity;
    }, 0);

    const supplyPowerWatts = loadPowerWatts / efficiency;
    return {
      loadPowerWatts,
      supplyPowerWatts,
      supplyCurrentAmps: supplyPowerWatts / supplyVoltage,
    };
  },

  /**
   * Roughly estimates a stepper's DC supply current from its phase current and
   * phase voltage or winding resistance. This is not a substitute for driver
   * or PSU specifications; actual draw varies with motion and load.
   * @param {number} supplyVoltage - DC driver supply voltage.
   * @param {number} phaseCurrentAmps - Motor phase current in amperes.
   * @param {{phaseVoltage?: number, windingResistanceOhms?: number, energizedPhases?: number, driverEfficiency?: number}} options
   */
  estimateStepperSupplyCurrent(
    supplyVoltage,
    phaseCurrentAmps,
    {
      phaseVoltage,
      windingResistanceOhms,
      energizedPhases = 2,
      driverEfficiency = 0.9,
    } = {},
  ) {
    if (
      !Number.isFinite(supplyVoltage) ||
      supplyVoltage <= 0 ||
      !Number.isFinite(phaseCurrentAmps) ||
      phaseCurrentAmps <= 0 ||
      !Number.isInteger(energizedPhases) ||
      energizedPhases < 1 ||
      energizedPhases > 2 ||
      !Number.isFinite(driverEfficiency) ||
      driverEfficiency <= 0 ||
      driverEfficiency > 1
    ) {
      throw new RangeError(
        "Supply voltage and phase current must be positive; energized phases must be 1 or 2; efficiency must be in (0, 1].",
      );
    }
    if ((phaseVoltage === undefined) === (windingResistanceOhms === undefined)) {
      throw new TypeError("Provide exactly one of phaseVoltage or windingResistanceOhms.");
    }

    let phasePowerWatts;
    if (phaseVoltage !== undefined) {
      if (!Number.isFinite(phaseVoltage) || phaseVoltage <= 0) {
        throw new RangeError("Phase voltage must be positive.");
      }
      phasePowerWatts = phaseCurrentAmps * phaseVoltage;
    } else {
      if (!Number.isFinite(windingResistanceOhms) || windingResistanceOhms <= 0) {
        throw new RangeError("Winding resistance must be positive.");
      }
      phasePowerWatts = phaseCurrentAmps ** 2 * windingResistanceOhms;
    }

    const estimatedMotorPowerWatts = phasePowerWatts * energizedPhases;
    return {
      estimatedMotorPowerWatts,
      estimatedSupplyCurrentAmps:
        estimatedMotorPowerWatts / (supplyVoltage * driverEfficiency),
    };
  },

  /**
   * Converts an American Wire Gauge size (AWG 0–40) to conductor area in mm².
   */
  awgToSquareMillimeters(awg) {
    if (!Number.isInteger(awg) || awg < 0 || awg > 40) {
      throw new RangeError("AWG must be an integer from 0 to 40.");
    }
    const diameterMm = 0.127 * Math.pow(92, (36 - awg) / 39);
    return (Math.PI * diameterMm ** 2) / 4;
  },

  /**
   * Calculates DC voltage drop and wire loss for a two-conductor circuit.
   * Length is the one-way distance; the calculation includes both conductors.
   * Wire resistance is based on resistivity at approximately 20°C.
   * @param {number} supplyVoltage - Source voltage in volts.
   * @param {number} current - Circuit current in amperes.
   * @param {number} oneWayLengthMeters - One-way wire length in meters.
   * @param {number} conductorAreaMm2 - Cross-sectional area of one conductor in mm².
   * @param {"copper"|"aluminum"} material - Conductor material.
   * @returns {{voltageDrop: number, voltageAtLoad: number, percentDrop: number, wirePowerLoss: number, loopResistance: number}}
   */
  dcWireVoltageDrop(
    supplyVoltage,
    current,
    oneWayLengthMeters,
    conductorAreaMm2,
    material = "copper",
  ) {
    if (
      !Number.isFinite(supplyVoltage) ||
      supplyVoltage <= 0 ||
      !Number.isFinite(current) ||
      current < 0 ||
      !Number.isFinite(oneWayLengthMeters) ||
      oneWayLengthMeters < 0 ||
      !Number.isFinite(conductorAreaMm2) ||
      conductorAreaMm2 <= 0
    ) {
      throw new RangeError(
        "Voltage and conductor area must be positive; current and wire length cannot be negative.",
      );
    }

    const resistivityOhmMeter = {
      copper: 1.724e-8,
      aluminum: 2.82e-8,
    }[material];
    if (resistivityOhmMeter === undefined) {
      throw new RangeError('Material must be "copper" or "aluminum".');
    }

    const loopResistance =
      (resistivityOhmMeter * 2 * oneWayLengthMeters) /
      (conductorAreaMm2 / 1e6);
    const voltageDrop = current * loopResistance;
    return {
      voltageDrop,
      voltageAtLoad: supplyVoltage - voltageDrop,
      percentDrop: (voltageDrop / supplyVoltage) * 100,
      wirePowerLoss: current ** 2 * loopResistance,
      loopResistance,
    };
  },

  /**
   * Calculates DC wire voltage drop when wire size is specified in AWG.
   * @param {number} supplyVoltage - Source voltage in volts.
   * @param {number} current - Circuit current in amperes.
   * @param {number} oneWayLengthMeters - One-way wire length in meters.
   * @param {number} awg - American Wire Gauge size from 0 to 40.
   * @param {"copper"|"aluminum"} material - Conductor material.
   */
  dcWireVoltageDropAwg(
    supplyVoltage,
    current,
    oneWayLengthMeters,
    awg,
    material = "copper",
  ) {
    return this.dcWireVoltageDrop(
      supplyVoltage,
      current,
      oneWayLengthMeters,
      this.awgToSquareMillimeters(awg),
      material,
    );
  },

  /**
   * Calculates electrical power for a DC load.
   */
  dcPowerWatts(voltage, current) {
    return voltage * current;
  },

  /**
   * Estimates electrical input power from mechanical shaft output and drive efficiency.
   * @param {number} shaftPowerWatts - Mechanical power delivered at the shaft.
   * @param {number} motorDriveEfficiency - Motor and drive efficiency from greater than 0 to 1.
   */
  electricalPowerFromShaft(shaftPowerWatts, motorDriveEfficiency = 0.8) {
    if (
      !Number.isFinite(shaftPowerWatts) ||
      shaftPowerWatts < 0 ||
      !Number.isFinite(motorDriveEfficiency) ||
      motorDriveEfficiency <= 0 ||
      motorDriveEfficiency > 1
    ) {
      throw new RangeError(
        "Shaft power must be non-negative and motor/drive efficiency must be in (0, 1].",
      );
    }
    return shaftPowerWatts / motorDriveEfficiency;
  },

  // ==========================================================================
  // 3. MOTION BOTTLENECK & STEP GENERATION LIMITS
  // ==========================================================================

  /**
   * Calculates the absolute Max Feed Rate (Linear Velocity) a controller can output
   * before its processor gets throttled by step-generation limits.
   * @param {number} controllerHz - Max step frequency (e.g., GRBL/Uno = 30000, ESP32/FluidNC = 120000).
   * @param {number} stepsOrCountsPerMm - The resolution of your axis.
   * @returns {number} Feed rate in mm/min.
   */
  maxFeedRateByFrequency(controllerHz, stepsOrCountsPerMm) {
    if (stepsOrCountsPerMm === 0) return 0;
    return (controllerHz / stepsOrCountsPerMm) * 60;
  },

  // ==========================================================================
  // 4. ADVANCED MECHANICAL DYNAMICS & MOMENT OF INERTIA (CRITICAL FOR SERVOS)
  // ==========================================================================

  /**
   * Calculates the Inertia of a solid cylindrical Lead Screw or Ball Screw.
   * Servos require matching the load inertia to the motor inertia (Inertia Ratio).
   * @param {number} massKg - Mass of the screw in kilograms.
   * @param {number} radiusMeter - Radius of the screw in meters (Diameter / 2).
   * @returns {number} Inertia in kg·m²
   */
  cylinderInertia(massKg, radiusMeter) {
    return 0.5 * massKg * Math.pow(radiusMeter, 2);
  },

  /**
   * Calculates the Reflected Inertia of a linearly moving load (gantry, carriage)
   * as seen by the rotating motor shaft through a screw mechanism.
   * @param {number} totalMovingMassKg - The physical mass of the moving axis/gantry in kg.
   * @param {number} screwLeadMeter - Screw lead converted into meters (mm / 1000).
   * @param {number} gearRatio - Gearing reduction ratio (Driven Teeth / Drive Teeth).
   * @returns {number} Reflected load inertia in kg·m²
   */
  reflectedLinearLoadInertia(totalMovingMassKg, screwLeadMeter, gearRatio) {
    // Formula: Mass * (Lead / (2 * PI * Gear Ratio))^2
    return (
      totalMovingMassKg *
      Math.pow(screwLeadMeter / (2 * Math.PI * gearRatio), 2)
    );
  },

  /**
   * Evaluates the Inertia Match Ratio. Critical for tuning Servos stability.
   * @param {number} totalLoadInertia - Combined reflected load inertia + screw inertia.
   * @param {number} motorInertia - Rotor inertia from the motor datasheet.
   * @returns {string|number} Ratio. (Target: Steppers < 10:1, High-performance Servos < 5:1 to 1:1)
   */
  getInertiaRatio(totalLoadInertia, motorInertia) {
    if (motorInertia === 0) return "Invalid Motor Inertia";
    return totalLoadInertia / motorInertia;
  },

  // ==========================================================================
  // 5. MOTOR TORQUE AND POWER REQUIREMENTS
  // ==========================================================================

  /**
   * Calculates the Torque required to convert rotational force into a desired linear thrust force.
   * Useful to determine if a NEMA 23, NEMA 34, or clearpath servo has enough torque to cut materials.
   * @param {number} targetThrustNewton - Cutting/Machining force + friction force required in Newtons.
   * @param {number} screwLeadMeter - Screw lead in meters.
   * @param {number} efficiency - Mechanical efficiency (e.g., 0.90 for ball screw, 0.40 for acme lead screw).
   * @returns {number} Required Torque in Newton-meters (Nm).
   */
  requiredTorqueForThrust(
    targetThrustNewton,
    screwLeadMeter,
    efficiency = 0.85,
  ) {
    return (targetThrustNewton * screwLeadMeter) / (2 * Math.PI * efficiency);
  },

  /**
   * Converts Mechanical Angular Velocity and Torque to Wattage.
   * Crucial for sizing Servo Drives, which are rated heavily by Watts, unlike Steppers.
   * @param {number} torqueNm - Output or required torque in Nm.
   * @param {number} rpm - Rotational speed in Revolutions Per Minute.
   * @returns {number} Power rating in Watts.
   */
  torqueAndRpmToWatts(torqueNm, rpm) {
    const angularVelocityRadSec = (rpm * 2 * Math.PI) / 60;
    return torqueNm * angularVelocityRadSec;
  },

  // ==========================================================================
  // 6. UNIT CONVERSIONS
  // ==========================================================================

  /**
   * Converts a length from millimeters to inches.
   */
  millimetersToInches(millimeters) {
    return millimeters / 25.4;
  },

  /**
   * Converts a length from inches to millimeters.
   */
  inchesToMillimeters(inches) {
    return inches * 25.4;
  },

  /**
   * Converts a length from meters to feet.
   */
  metersToFeet(meters) {
    return meters / 0.3048;
  },

  /**
   * Converts a length from feet to meters.
   */
  feetToMeters(feet) {
    return feet * 0.3048;
  },

  /**
   * Converts a mass from kilograms to pounds.
   */
  kilogramsToPounds(kilograms) {
    return kilograms / 0.45359237;
  },

  /**
   * Converts a mass from pounds to kilograms.
   */
  poundsToKilograms(pounds) {
    return pounds * 0.45359237;
  },

  /**
   * Converts a force from newtons to pound-force (lbf).
   */
  newtonsToPoundForce(newtons) {
    return newtons / 4.4482216152605;
  },

  /**
   * Converts a force from pound-force (lbf) to newtons.
   */
  poundForceToNewtons(poundForce) {
    return poundForce * 4.4482216152605;
  },

  /**
   * Converts torque from newton-meters to pound-feet.
   */
  newtonMetersToPoundFeet(newtonMeters) {
    return newtonMeters / 1.3558179483314;
  },

  /**
   * Converts torque from pound-feet to newton-meters.
   */
  poundFeetToNewtonMeters(poundFeet) {
    return poundFeet * 1.3558179483314;
  },

  /**
   * Converts torque from newton-meters to pound-inches.
   */
  newtonMetersToPoundInches(newtonMeters) {
    return newtonMeters / 0.1129848290276;
  },

  /**
   * Converts torque from pound-inches to newton-meters.
   */
  poundInchesToNewtonMeters(poundInches) {
    return poundInches * 0.1129848290276;
  },

  /**
   * Converts power from watts to mechanical horsepower.
   */
  wattsToHorsepower(watts) {
    return watts / 745.6998715822702;
  },

  /**
   * Converts power from mechanical horsepower to watts.
   */
  horsepowerToWatts(horsepower) {
    return horsepower * 745.6998715822702;
  },

  /**
   * Converts steps per millimeter to steps per inch.
   */
  stepsPerMmToStepsPerInch(stepsPerMm) {
    return stepsPerMm * 25.4;
  },

  /**
   * Converts steps per inch to steps per millimeter.
   */
  stepsPerInchToStepsPerMm(stepsPerInch) {
    return stepsPerInch / 25.4;
  },

  // ==========================================================================
  // 7. REAL-WORLD PHYSICAL CALIBRATION
  // ==========================================================================

  /**
   * Averages backlash measurements and converts the result to compensation pulses.
   * The inch conversion follows the supplied procedure's rounded 2.5 µm per 0.0001 in.
   */
  backlashCompensationPulses(
    measuredBacklashReadings,
    measurementUnit = "inch",
    pulsesPerMicron = 4,
  ) {
    const micronsPerUnitByUnit = {
      inch: 25000,
      thou: 25,
      mm: 1000,
      micron: 1,
    };
    const micronsPerUnit = Object.hasOwn(micronsPerUnitByUnit, measurementUnit)
      ? micronsPerUnitByUnit[measurementUnit]
      : undefined;
    if (
      !Array.isArray(measuredBacklashReadings) ||
      measuredBacklashReadings.length === 0 ||
      measuredBacklashReadings.some(
        (reading) => !Number.isFinite(reading) || reading < 0,
      )
    ) {
      throw new RangeError(
        "Enter one or more finite, non-negative backlash measurements.",
      );
    }
    if (micronsPerUnit === undefined) {
      throw new RangeError(
        "Choose inches, thousandths of an inch, millimeters, or micrometers.",
      );
    }
    if (!Number.isFinite(pulsesPerMicron) || pulsesPerMicron <= 0) {
      throw new RangeError("Pulses per micrometer must be a positive number.");
    }

    const averageBacklash = measuredBacklashReadings.reduce(
      (average, reading, index) => average + (reading - average) / (index + 1),
      0,
    );
    const compensationPulses = averageBacklash * micronsPerUnit * pulsesPerMicron;
    if (!Number.isFinite(compensationPulses)) {
      throw new RangeError("The calculated backlash compensation is outside the supported range.");
    }
    return Math.round(compensationPulses);
  },

  /**
   * Compensates for physical backlash, minor manufacturing variances, or belt stretch.
   */
  calibrateSteps(currentSteps, commandedDistance, actualDistance) {
    if (actualDistance === 0) return currentSteps;
    return currentSteps * (commandedDistance / actualDistance);
  },

  /**
   * Finds the deviation range from a straight reference joining the first and last readings.
   * Readings must be in micrometers and evenly spaced across the measured length.
   */
  straightnessErrorUm(measurementLengthMm, readingsUm) {
    return calculateStraightnessErrorUm(measurementLengthMm, readingsUm);
  },

  /**
   * Scales the measured straightness error proportionally to a 500 mm reference length.
   */
  straightnessErrorPer500Mm(measurementLengthMm, readingsUm) {
    return (calculateStraightnessErrorUm(measurementLengthMm, readingsUm) * 500)
      / measurementLengthMm;
  },
};

// Export statement if using ES module architecture
export default CncHardwareMath;
