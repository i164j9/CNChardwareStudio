import CncHardwareMath from './cncHardwareMath.js';

let blockCounter = 0;
let activeBlocks = [];

const excludedFormulas = new Set([
    'millimetersToInches',
    'inchesToMillimeters',
    'metersToFeet',
    'feetToMeters',
    'kilogramsToPounds',
    'poundsToKilograms',
    'newtonsToPoundForce',
    'poundForceToNewtons',
    'newtonMetersToPoundFeet',
    'poundFeetToNewtonMeters',
    'newtonMetersToPoundInches',
    'poundInchesToNewtonMeters',
    'wattsToHorsepower',
    'horsepowerToWatts',
    'stepsPerMmToStepsPerInch',
    'stepsPerInchToStepsPerMm',
    'dcWireVoltageDropAwg',
]);

const formulaParameterRegistry = {
    estimateStepperSupplyCurrent: {
        type: 'destructured_object',
        inputs: [
            'supplyVoltage',
            'phaseCurrentAmps',
            'phaseVoltage',
            'windingResistanceOhms',
            'energizedPhases',
            'driverEfficiency',
        ],
    },
    estimateDcSupplyCurrent: {
        type: 'array_of_objects',
        inputs: [
            'supplyVoltage',
            'loadPowerWatts',
            'loadVoltage',
            'loadCurrentAmps',
            'loadQuantity',
            'efficiency',
        ],
    },
    dcWireVoltageDrop: {
        type: 'positional',
        inputs: [
            'supplyVoltage',
            'current',
            'oneWayLengthMeters',
            'conductorAreaMm2',
            'material',
        ],
    },
    electricalPowerFromShaft: {
        type: 'positional',
        inputs: ['shaftPowerWatts', 'motorDriveEfficiency'],
    },
};
const resultUnitOptions = {
    length: {
        default: 'mm',
        units: [
            { label: 'nm', toBase: 1e-9 },
            { label: 'µm', toBase: 1e-6 },
            { label: 'mm', toBase: 1e-3 },
            { label: 'm', toBase: 1 },
            { label: 'in', toBase: 0.0254 },
            { label: 'ft', toBase: 0.3048 },
        ],
    },
    resolution: {
        default: 'steps/mm',
        units: [
            { label: 'steps/mm', toBase: 1000 },
            { label: 'steps/in', toBase: 1 / 0.0254 },
        ],
    },
    countResolution: {
        default: 'counts/mm',
        units: [
            { label: 'counts/mm', toBase: 1000 },
            { label: 'counts/in', toBase: 1 / 0.0254 },
        ],
    },
    displacementPerCount: {
        default: 'mm/step or count',
        units: [
            { label: 'nm/step or count', toBase: 1e-9 },
            { label: 'µm/step or count', toBase: 1e-6 },
            { label: 'mm/step or count', toBase: 1e-3 },
            { label: 'in/step or count', toBase: 0.0254 },
        ],
    },
    speed: {
        default: 'mm/min',
        units: [
            { label: 'mm/min', toBase: 1e-3 },
            { label: 'm/min', toBase: 1 },
            { label: 'in/min', toBase: 0.0254 },
            { label: 'ft/min', toBase: 0.3048 },
        ],
    },
    current: {
        default: 'A',
        units: [
            { label: 'µA', toBase: 1e-6 },
            { label: 'mA', toBase: 1e-3 },
            { label: 'A', toBase: 1 },
            { label: 'kA', toBase: 1e3 },
        ],
    },
    voltage: {
        default: 'V',
        units: [
            { label: 'µV', toBase: 1e-6 },
            { label: 'mV', toBase: 1e-3 },
            { label: 'V', toBase: 1 },
            { label: 'kV', toBase: 1e3 },
        ],
    },
    power: {
        default: 'W',
        units: [
            { label: 'mW', toBase: 1e-3 },
            { label: 'W', toBase: 1 },
            { label: 'kW', toBase: 1e3 },
            { label: 'MW', toBase: 1e6 },
        ],
    },
    apparentPower: {
        default: 'VA',
        units: [
            { label: 'mVA', toBase: 1e-3 },
            { label: 'VA', toBase: 1 },
            { label: 'kVA', toBase: 1e3 },
            { label: 'MVA', toBase: 1e6 },
        ],
    },
    reactivePower: {
        default: 'var',
        units: [
            { label: 'mvar', toBase: 1e-3 },
            { label: 'var', toBase: 1 },
            { label: 'kvar', toBase: 1e3 },
            { label: 'Mvar', toBase: 1e6 },
        ],
    },
    resistance: {
        default: 'Ω',
        units: [
            { label: 'mΩ', toBase: 1e-3 },
            { label: 'Ω', toBase: 1 },
            { label: 'kΩ', toBase: 1e3 },
            { label: 'MΩ', toBase: 1e6 },
        ],
    },
    frequency: {
        default: 'Hz',
        units: [
            { label: 'Hz', toBase: 1 },
            { label: 'kHz', toBase: 1e3 },
            { label: 'MHz', toBase: 1e6 },
        ],
    },
    powerFactor: {
        default: 'PF (0–1)',
        units: [
            { label: 'PF (0–1)', toBase: 1 },
            { label: '%', toBase: 0.01 },
        ],
    },
    energy: {
        default: 'J',
        units: [
            { label: 'mJ', toBase: 1e-3 },
            { label: 'J', toBase: 1 },
            { label: 'kJ', toBase: 1e3 },
        ],
    },
    inductance: {
        default: 'H',
        units: [
            { label: 'µH', toBase: 1e-6 },
            { label: 'mH', toBase: 1e-3 },
            { label: 'H', toBase: 1 },
        ],
    },
    capacitance: {
        default: 'F',
        units: [
            { label: 'pF', toBase: 1e-12 },
            { label: 'nF', toBase: 1e-9 },
            { label: 'µF', toBase: 1e-6 },
            { label: 'mF', toBase: 1e-3 },
            { label: 'F', toBase: 1 },
        ],
    },
    torque: {
        default: 'N·m',
        units: [
            { label: 'µN·m', toBase: 1e-6 },
            { label: 'mN·m', toBase: 1e-3 },
            { label: 'N·m', toBase: 1 },
            { label: 'N·cm', toBase: 0.01 },
            { label: 'N·mm', toBase: 0.001 },
            { label: 'lb·in', toBase: 0.1129848290276 },
            { label: 'lb·ft', toBase: 1.3558179483314 },
        ],
    },
    area: {
        default: 'mm²',
        units: [
            { label: 'mm²', toBase: 1e-6 },
            { label: 'cm²', toBase: 1e-4 },
            { label: 'm²', toBase: 1 },
            { label: 'in²', toBase: 0.00064516 },
        ],
    },
    angle: {
        default: 'rad',
        units: [
            { label: 'rad', toBase: 1 },
            { label: '°', toBase: Math.PI / 180 },
        ],
    },
    mass: {
        default: 'kg',
        units: [
            { label: 'g', toBase: 0.001 },
            { label: 'kg', toBase: 1 },
            { label: 'lb', toBase: 0.45359237 },
        ],
    },
    force: {
        default: 'N',
        units: [
            { label: 'mN', toBase: 1e-3 },
            { label: 'N', toBase: 1 },
            { label: 'lbf', toBase: 4.4482216152605 },
        ],
    },
};
const formulaResultUnits = {
    stepperScrewStepsPerMm: { dimension: 'resolution', nativeFactor: 1000 },
    stepperDirectScrewStepsPerMm: { dimension: 'resolution', nativeFactor: 1000 },
    stepperPureBeltStepsPerMm: { dimension: 'resolution', nativeFactor: 1000 },
    servoScrewCountsPerMm: { dimension: 'countResolution', nativeFactor: 1000 },
    servoDirectScrewCountsPerMm: { dimension: 'countResolution', nativeFactor: 1000 },
    getMechanicalResolution: { dimension: 'displacementPerCount', nativeFactor: 1e-3 },
    stepperMaxTargetVoltage: { dimension: 'voltage' },
    estimateTotalPsuCurrent: { dimension: 'current' },
    dcCurrentFromPower: { dimension: 'current' },
    currentFromVoltageAndResistance: { dimension: 'current' },
    singlePhaseAcCurrent: { dimension: 'current' },
    threePhaseAcCurrent: { dimension: 'current' },
    acRmsVoltageToPeak: { dimension: 'voltage' },
    acPeakVoltageToRms: { dimension: 'voltage' },
    acRmsCurrentToPeak: { dimension: 'current' },
    acPeakCurrentToRms: { dimension: 'current' },
    singlePhaseAcApparentPower: { dimension: 'apparentPower' },
    threePhaseAcApparentPower: { dimension: 'apparentPower' },
    singlePhaseAcRealPower: { dimension: 'power' },
    threePhaseAcRealPower: { dimension: 'power' },
    singlePhaseAcReactivePower: { dimension: 'reactivePower' },
    threePhaseAcReactivePower: { dimension: 'reactivePower' },
    singlePhaseAcPowerFactor: { dimension: 'powerFactor' },
    threePhaseAcPowerFactor: { dimension: 'powerFactor' },
    seriesRlcImpedanceOhms: { dimension: 'resistance' },
    seriesRlcCurrentAmps: { dimension: 'current' },
    seriesRlcPowerFactor: { unit: 'ratio' },
    seriesRlcPhaseAngleRadians: { dimension: 'angle' },
    inductiveReactanceOhms: { dimension: 'resistance' },
    capacitiveReactanceOhms: { dimension: 'resistance' },
    lcResonantFrequencyHz: { dimension: 'frequency' },
    inductorEnergyJoules: { dimension: 'energy' },
    capacitorEnergyJoules: { dimension: 'energy' },
    inductanceFromVoltageAndCurrentRamp: { dimension: 'inductance' },
    capacitanceFromCurrentAndVoltageRamp: { dimension: 'capacitance' },
    estimateDcSupplyCurrent: { dimension: 'current' },
    estimateStepperSupplyCurrent: { dimension: 'current' },
    awgToSquareMillimeters: { dimension: 'area', nativeFactor: 1e-6 },
    dcWireVoltageDrop: { dimension: 'voltage' },
    dcWireVoltageDropAwg: { dimension: 'voltage' },
    dcPowerWatts: { dimension: 'power' },
    electricalPowerFromShaft: { dimension: 'power' },
    maxFeedRateByFrequency: { dimension: 'speed', nativeFactor: 1e-3 },
    cylinderInertia: { unit: 'kg·m²' },
    reflectedLinearLoadInertia: { unit: 'kg·m²' },
    getInertiaRatio: { unit: ':1' },
    requiredTorqueForThrust: { dimension: 'torque' },
    torqueAndRpmToWatts: { dimension: 'power' },
    millimetersToInches: { dimension: 'length', nativeFactor: 0.0254 },
    inchesToMillimeters: { dimension: 'length', nativeFactor: 1e-3 },
    metersToFeet: { dimension: 'length', nativeFactor: 0.3048 },
    feetToMeters: { dimension: 'length' },
    kilogramsToPounds: { dimension: 'mass', nativeFactor: 0.45359237 },
    poundsToKilograms: { dimension: 'mass' },
    newtonsToPoundForce: { dimension: 'force', nativeFactor: 4.4482216152605 },
    poundForceToNewtons: { dimension: 'force' },
    newtonMetersToPoundFeet: { dimension: 'torque', nativeFactor: 1.3558179483314 },
    poundFeetToNewtonMeters: { dimension: 'torque' },
    newtonMetersToPoundInches: { dimension: 'torque', nativeFactor: 0.1129848290276 },
    poundInchesToNewtonMeters: { dimension: 'torque' },
    wattsToHorsepower: { dimension: 'power', nativeFactor: 745.6998715822702 },
    horsepowerToWatts: { dimension: 'power' },
    stepsPerMmToStepsPerInch: { dimension: 'resolution', nativeFactor: 1 / 0.0254 },
    stepsPerInchToStepsPerMm: { dimension: 'resolution', nativeFactor: 1000 },
    calibrateSteps: { unit: 'steps or counts' },
};
const formulaDisplayNames = {
    stepperScrewStepsPerMm: 'Axis steps per mm — stepper with belt or gears to screw',
    stepperDirectScrewStepsPerMm: 'Axis steps per mm — stepper directly connected to screw',
    stepperPureBeltStepsPerMm: 'Axis steps per mm — stepper driving a belt',
    servoScrewCountsPerMm: 'Axis counts per mm — servo with belt or gears to screw',
    servoDirectScrewCountsPerMm: 'Axis counts per mm — servo directly connected to screw',
    getMechanicalResolution: 'Distance moved by one motor step or encoder count',
    stepperMaxTargetVoltage: 'Stepper driver voltage estimate from motor inductance',
    estimateTotalPsuCurrent: 'Estimated power-supply current for multiple motors',
    dcCurrentFromPower: 'DC current from power and voltage',
    currentFromVoltageAndResistance: 'Current through a resistor (Ohm’s law)',
    singlePhaseAcCurrent: 'AC current — single-phase equipment',
    threePhaseAcCurrent: 'AC current — balanced three-phase equipment',
    acRmsVoltageToPeak: 'Convert AC voltage from RMS to peak',
    acPeakVoltageToRms: 'Convert AC voltage from peak to RMS',
    acRmsCurrentToPeak: 'Convert AC current from RMS to peak',
    acPeakCurrentToRms: 'Convert AC current from peak to RMS',
    singlePhaseAcApparentPower: 'Apparent power — single-phase equipment',
    threePhaseAcApparentPower: 'Apparent power — balanced three-phase equipment',
    singlePhaseAcRealPower: 'Useful electrical power — single-phase equipment',
    threePhaseAcRealPower: 'Useful electrical power — balanced three-phase equipment',
    singlePhaseAcReactivePower: 'Reactive power — single-phase equipment',
    threePhaseAcReactivePower: 'Reactive power — balanced three-phase equipment',
    singlePhaseAcPowerFactor: 'Power factor — single-phase equipment',
    threePhaseAcPowerFactor: 'Power factor — balanced three-phase equipment',
    seriesRlcImpedanceOhms: 'Total opposition to AC current — resistor, coil, and capacitor',
    seriesRlcCurrentAmps: 'AC current through a resistor, coil, and capacitor',
    seriesRlcPowerFactor: 'Power factor for a resistor, coil, and capacitor circuit',
    seriesRlcPhaseAngleRadians: 'Timing difference between voltage and current — RLC circuit',
    inductiveReactanceOhms: 'AC opposition from a coil (inductive reactance)',
    capacitiveReactanceOhms: 'AC opposition from a capacitor (capacitive reactance)',
    lcResonantFrequencyHz: 'Resonant frequency of a coil and capacitor',
    inductorEnergyJoules: 'Energy stored in a coil (inductor)',
    capacitorEnergyJoules: 'Energy stored in a capacitor',
    inductanceFromVoltageAndCurrentRamp: 'Coil inductance from measured voltage and current change',
    capacitanceFromCurrentAndVoltageRamp: 'Capacitance from measured current and voltage change',
    estimateDcSupplyCurrent: 'Estimated DC power-supply current for a load',
    estimateStepperSupplyCurrent: 'Estimated DC supply current for a stepper driver',
    awgToSquareMillimeters: 'Wire area from American Wire Gauge (AWG)',
    dcWireVoltageDrop: 'Voltage lost along a DC wire',
    dcPowerWatts: 'DC power from voltage and current',
    electricalPowerFromShaft: 'Electrical input power from motor shaft power',
    maxFeedRateByFrequency: 'Maximum axis speed from controller pulse rate',
    cylinderInertia: 'Rotational inertia of a solid cylinder',
    reflectedLinearLoadInertia: 'Moving machine mass converted to motor-shaft inertia',
    getInertiaRatio: 'Compare machine load inertia with motor inertia',
    requiredTorqueForThrust: 'Screw torque needed to produce a linear push or pull',
    torqueAndRpmToWatts: 'Motor shaft power from torque and RPM',
    calibrateSteps: 'Correct the controller steps/mm from a measured move',
};
const formulaDescriptions = {
    stepperScrewStepsPerMm: 'Calculates how many stepper motor commands move the axis 1 mm. Use this when a belt or gears connect the motor to a lead screw.',
    stepperDirectScrewStepsPerMm: 'Calculates how many stepper motor commands move the axis 1 mm when the motor is coupled directly to the lead screw.',
    stepperPureBeltStepsPerMm: 'Calculates how many stepper motor commands move a belt axis 1 mm from the motor step count, belt tooth spacing, and pulley teeth.',
    servoScrewCountsPerMm: 'Calculates how many encoder counts move a screw-driven servo axis 1 mm when a belt or gears connect the motor to the screw. The encoder pulse rating is multiplied by four for quadrature counting.',
    servoDirectScrewCountsPerMm: 'Calculates how many encoder counts move a directly connected servo screw axis 1 mm. The encoder pulse rating is multiplied by four for quadrature counting.',
    getMechanicalResolution: 'Calculates how far the axis moves for one step or encoder count. A smaller distance means finer command resolution; it does not guarantee the machine’s actual accuracy.',
    stepperMaxTargetVoltage: 'Estimates a stepper driver voltage from the motor winding inductance. Treat this as a rough guide only and follow the motor and driver manufacturers’ limits.',
    estimateTotalPsuCurrent: 'Estimates the combined DC supply current for several motors using a rough concurrency allowance. Use a measured or manufacturer-specified supply-side current for a more reliable result.',
    dcCurrentFromPower: 'Calculates DC current by dividing the load power in watts by the supply voltage in volts.',
    currentFromVoltageAndResistance: 'Uses Ohm’s law to estimate current through a resistance: voltage divided by resistance.',
    singlePhaseAcCurrent: 'Estimates current for a single-phase AC load from real power, RMS voltage, and power factor. Enter power in watts, voltage in volts, and power factor from 0 to 1.',
    threePhaseAcCurrent: 'Estimates line current for a balanced three-phase AC load from total real power, line-to-line RMS voltage, and power factor. It assumes the three phases are evenly balanced.',
    acRmsVoltageToPeak: 'Converts an AC sine-wave voltage from its RMS value (the common meter rating) to its peak value.',
    acPeakVoltageToRms: 'Converts the peak voltage of an AC sine wave to its RMS value (the value commonly shown on meters and equipment ratings).',
    acRmsCurrentToPeak: 'Converts the RMS current of an AC sine wave to its peak current.',
    acPeakCurrentToRms: 'Converts the peak current of an AC sine wave to its RMS current.',
    singlePhaseAcApparentPower: 'Calculates single-phase apparent power by multiplying RMS voltage by RMS current. The result is in volt-amperes (VA), not watts.',
    threePhaseAcApparentPower: 'Calculates apparent power for a balanced three-phase load from line-to-line RMS voltage and line current. The result is in volt-amperes (VA), not watts.',
    singlePhaseAcRealPower: 'Calculates useful single-phase AC power from RMS voltage, RMS current, and power factor. The result is in watts.',
    threePhaseAcRealPower: 'Calculates useful power for a balanced three-phase AC load from line voltage, line current, and power factor. The result is in watts.',
    singlePhaseAcReactivePower: 'Estimates the back-and-forth reactive power for single-phase equipment. It reports the size of the reactive power in vars, but not whether the load is leading or lagging.',
    threePhaseAcReactivePower: 'Estimates the size of reactive power for a balanced three-phase load in vars. It does not indicate whether the load is leading or lagging.',
    singlePhaseAcPowerFactor: 'Finds the single-phase power factor from real power, RMS voltage, and RMS current. A result near 1 means most supplied power is doing useful work; lower values mean more current is needed for the same useful power.',
    threePhaseAcPowerFactor: 'Finds the power factor of a balanced three-phase load from total real power, line-to-line RMS voltage, and line current. A result near 1 means most supplied power is doing useful work.',
    seriesRlcImpedanceOhms: 'Calculates how strongly a series resistor, inductor (coil), and capacitor together oppose AC current at a chosen frequency. This idealized result is in ohms.',
    seriesRlcCurrentAmps: 'Estimates RMS current through an ideal series resistor, inductor, and capacitor using the source voltage and frequency.',
    seriesRlcPowerFactor: 'Calculates the power-factor magnitude of an ideal series resistor, inductor, and capacitor circuit at the chosen frequency.',
    seriesRlcPhaseAngleRadians: 'Calculates the phase angle between voltage and current in an ideal series RLC circuit. Positive means the circuit acts inductively; negative means it acts capacitively.',
    inductiveReactanceOhms: 'Calculates how much a coil opposes AC current at a chosen frequency. The result is in ohms and increases with frequency.',
    capacitiveReactanceOhms: 'Calculates how much a capacitor opposes AC current at a chosen frequency. The result is in ohms and decreases as frequency increases.',
    lcResonantFrequencyHz: 'Estimates the frequency at which an ideal inductor and capacitor resonate. Real components have losses and tolerances, so their actual resonant frequency can differ.',
    inductorEnergyJoules: 'Calculates the energy stored in a coil from its inductance and the current flowing through it.',
    capacitorEnergyJoules: 'Calculates the energy stored in a capacitor from its capacitance and voltage.',
    inductanceFromVoltageAndCurrentRamp: 'Estimates inductance from the voltage applied to a coil and the measured current change over time. Use the voltage, current difference, and time for the same measurement interval.',
    capacitanceFromCurrentAndVoltageRamp: 'Estimates capacitance from the current flowing into a capacitor and its measured voltage change over time.',
    estimateDcSupplyCurrent: 'Estimates DC input current for one or more loads, allowing for power-supply efficiency. Enter each load as power or as voltage and current; this block supports one load group.',
    estimateStepperSupplyCurrent: 'Roughly estimates DC current drawn by a stepper driver from the supply voltage, motor phase current, and either phase voltage or winding resistance. It is not the same as motor phase current.',
    awgToSquareMillimeters: 'Converts an American Wire Gauge (AWG) wire size to the conductor’s cross-sectional area in square millimeters. This does not by itself determine safe wire current.',
    dcWireVoltageDrop: 'Estimates how much voltage is lost along a two-conductor DC wire run. Enter the one-way length; the calculation includes the return wire and uses the selected conductor material.',
    dcPowerWatts: 'Calculates DC electrical power by multiplying voltage by current.',
    electricalPowerFromShaft: 'Estimates electrical input power needed to produce the entered motor-shaft power, allowing for motor and drive losses.',
    maxFeedRateByFrequency: 'Estimates the highest axis speed allowed by the controller pulse rate and the configured steps or counts per millimeter. Real machine limits may be lower.',
    cylinderInertia: 'Calculates the rotational inertia of a solid cylinder about its center axis from its mass and radius.',
    reflectedLinearLoadInertia: 'Converts the moving mass and screw-drive details into an equivalent rotational inertia at the motor. This helps compare the load with the motor, but does not include every machine component automatically.',
    getInertiaRatio: 'Divides the load inertia by the motor’s rotor inertia. Use the motor manufacturer’s guidance to judge whether the resulting ratio is suitable.',
    requiredTorqueForThrust: 'Estimates the motor torque needed at the screw to create a chosen linear push or pull, allowing for screw lead and drive efficiency.',
    torqueAndRpmToWatts: 'Calculates mechanical shaft power from rotational torque and speed.',
    calibrateSteps: 'Corrects the controller’s steps-or-counts-per-distance setting using a commanded move and the distance the machine actually moved. Measure both distances in the same unit.',
};
const formulaInputOptions = {
    'dcWireVoltageDrop.material': [
        { value: 'copper', label: 'Copper' },
        { value: 'aluminum', label: 'Aluminum' },
    ],
};
const optionalFormulaParameters = new Set([
    'estimateStepperSupplyCurrent.phaseVoltage',
    'estimateStepperSupplyCurrent.windingResistanceOhms',
    'estimateDcSupplyCurrent.loadPowerWatts',
]);
const formulaParameterDefaults = {
    'estimateStepperSupplyCurrent.energizedPhases': 2,
    'estimateStepperSupplyCurrent.driverEfficiency': 0.9,
    'estimateDcSupplyCurrent.supplyVoltage': 24,
    'estimateDcSupplyCurrent.loadVoltage': 24,
    'estimateDcSupplyCurrent.loadCurrentAmps': 0,
    'estimateDcSupplyCurrent.loadQuantity': 1,
    'estimateDcSupplyCurrent.efficiency': 1,
    'dcWireVoltageDrop.supplyVoltage': 48,
    'dcWireVoltageDrop.current': 0,
    'dcWireVoltageDrop.oneWayLengthMeters': 12,
    'dcWireVoltageDrop.conductorAreaMm2': 2.5,
    'dcWireVoltageDrop.material': 'copper',
    'electricalPowerFromShaft.motorDriveEfficiency': 0.8,
};
const formulaInputDisplayNames = {
    motorSteps: 'Full steps per motor turn',
    microstepping: 'Microsteps per full step',
    driveTeeth: 'Teeth on motor pulley or gear',
    drivenTeeth: 'Teeth on screw pulley or gear',
    screwLead: 'Screw travel per turn (mm)',
    beltPitch: 'Distance between belt teeth (mm)',
    pulleyTeeth: 'Teeth on motor pulley',
    encoderPpr: 'Encoder pulses per motor turn (PPR)',
    stepsOrCountsPerMm: 'Axis steps or counts per mm',
    inductanceMh: 'Motor winding inductance (mH)',
    maxCurrentPerMotor: 'DC supply current per motor (A)',
    totalMotors: 'Number of motors',
    powerWatts: 'Real power used (W)',
    voltage: 'Voltage (V)',
    resistanceOhms: 'Resistance (Ω)',
    lineVoltage: 'Line-to-line voltage (V RMS)',
    powerFactor: 'Power factor (0 to 1)',
    voltageRms: 'Voltage (V RMS)',
    currentRms: 'Current (A RMS)',
    voltagePeak: 'Peak voltage (V)',
    currentPeak: 'Peak current (A)',
    lineVoltageRms: 'Line-to-line voltage (V RMS)',
    lineCurrentRms: 'Line current (A RMS)',
    realPowerWatts: 'Useful real power (W)',
    inductanceHenries: 'Inductance (H)',
    capacitanceFarads: 'Capacitance (F)',
    frequencyHz: 'AC frequency (Hz)',
    currentAmps: 'Current (A)',
    currentChangeAmps: 'Measured current change (A)',
    timeSeconds: 'Elapsed time (s)',
    voltageChange: 'Measured voltage change (V)',
    supplyVoltage: 'DC supply voltage (V)',
    loadPowerWatts: 'Power for one load group (W)',
    loadVoltage: 'Voltage for each load (V)',
    loadCurrentAmps: 'Current for each load (A)',
    loadQuantity: 'Number of identical loads',
    efficiency: 'Drive efficiency (0 to 1)',
    phaseCurrentAmps: 'Motor phase current (A)',
    phaseVoltage: 'Motor phase voltage (V)',
    windingResistanceOhms: 'Motor winding resistance (Ω)',
    energizedPhases: 'Motor phases drawing current',
    driverEfficiency: 'Driver efficiency (0 to 1)',
    awg: 'Wire size (AWG)',
    current: 'Load current (A)',
    oneWayLengthMeters: 'One-way wire length (m)',
    conductorAreaMm2: 'Wire cross-sectional area (mm²)',
    material: 'Wire material',
    shaftPowerWatts: 'Motor shaft output power (W)',
    motorDriveEfficiency: 'Motor and drive efficiency (0 to 1)',
    controllerHz: 'Controller pulse rate (pulses/s)',
    massKg: 'Cylinder mass (kg)',
    radiusMeter: 'Cylinder radius (m)',
    totalMovingMassKg: 'Total moving axis mass (kg)',
    screwLeadMeter: 'Screw travel per turn (m)',
    gearRatio: 'Motor turns per screw turn',
    totalLoadInertia: 'Machine load inertia (kg·m²)',
    motorInertia: 'Motor rotor inertia (kg·m²)',
    targetThrustNewton: 'Required push or pull force (N)',
    torqueNm: 'Shaft torque (N·m)',
    rpm: 'Shaft speed (RPM)',
    currentSteps: 'Current steps/counts per unit distance',
    commandedDistance: 'Distance the controller was told to move',
    actualDistance: 'Distance the machine actually moved',
};
const formulaInputDescriptions = {
    stepperScrewStepsPerMm: {
        motorSteps: 'Full-step count for one motor revolution, usually 200 for a 1.8° stepper. Find it in the motor datasheet.',
        microstepping: 'Driver setting for how many microsteps divide each full motor step, such as 8 or 16.',
        driveTeeth: 'Number of teeth on the motor/input pulley or gear.',
        drivenTeeth: 'Number of teeth on the screw/output pulley or gear. The transmission ratio is driven teeth ÷ drive teeth.',
        screwLead: 'Distance the screw moves in one revolution, in millimeters. This is lead (travel per turn), not thread pitch unless they are equal.',
    },
    stepperDirectScrewStepsPerMm: {
        motorSteps: 'Full-step count for one motor revolution, usually 200 for a 1.8° stepper. Find it in the motor datasheet.',
        microstepping: 'Driver setting for how many microsteps divide each full motor step, such as 8 or 16.',
        screwLead: 'Distance the directly driven screw moves in one revolution, in millimeters.',
    },
    stepperPureBeltStepsPerMm: {
        motorSteps: 'Full-step count for one motor revolution, usually 200 for a 1.8° stepper.',
        microstepping: 'Driver setting for how many microsteps divide each full motor step, such as 8 or 16.',
        beltPitch: 'Distance between neighboring belt teeth, in millimeters (for example, 2 mm GT2 belt).',
        pulleyTeeth: 'Number of teeth on the motor pulley. Belt travel per motor turn is pitch × tooth count.',
    },
    servoScrewCountsPerMm: {
        encoderPpr: 'Encoder pulses (lines) per motor revolution before quadrature decoding. This formula multiplies the value by 4.',
        driveTeeth: 'Number of teeth on the motor/input pulley or gear.',
        drivenTeeth: 'Number of teeth on the screw/output pulley or gear. The transmission ratio is driven teeth ÷ drive teeth.',
        screwLead: 'Distance the screw moves in one revolution, in millimeters. This is lead (travel per turn), not thread pitch unless equal.',
    },
    servoDirectScrewCountsPerMm: {
        encoderPpr: 'Encoder pulses (lines) per motor revolution before quadrature decoding. This formula multiplies the value by 4.',
        screwLead: 'Distance the directly driven screw moves in one revolution, in millimeters.',
    },
    getMechanicalResolution: {
        stepsOrCountsPerMm: 'Configured motor steps or encoder counts required to move the axis by 1 mm. The result is millimeters per step/count.',
    },
    stepperMaxTargetVoltage: {
        inductanceMh: 'Motor phase inductance in millihenries (mH), usually listed on the motor datasheet. This estimate expects mH, not H.',
    },
    estimateTotalPsuCurrent: {
        maxCurrentPerMotor: 'Estimated DC supply current for one motor, in amperes. Use supply-side current, not the motor winding/phase-current rating.',
        totalMotors: 'Number of motors connected to the shared DC power supply.',
    },
    dcCurrentFromPower: {
        powerWatts: 'DC electrical load power in watts. Enter the power consumed by the equipment.',
        voltage: 'DC supply voltage across the load, in volts. The estimate divides power by this voltage.',
    },
    currentFromVoltageAndResistance: {
        voltage: 'DC voltage applied across the resistor, in volts.',
        resistanceOhms: 'Resistance between the two measurement points, in ohms (Ω).',
    },
    singlePhaseAcCurrent: {
        powerWatts: 'Single-phase AC real power consumed by the load, in watts (W).',
        voltage: 'Single-phase AC RMS supply voltage in volts (V), normally the effective value shown on an AC meter.',
        powerFactor: 'Ratio of real power to apparent power for this AC load, from greater than 0 to 1. Use 1 for an ideal resistive load.',
    },
    threePhaseAcCurrent: {
        powerWatts: 'Total three-phase real power consumed by the balanced load, in watts (W).',
        lineVoltage: 'Three-phase line-to-line RMS voltage, measured between two phase wires.',
        powerFactor: 'Ratio of real power to apparent power for the balanced AC load, from greater than 0 to 1.',
    },
    acRmsVoltageToPeak: {
        voltageRms: 'Effective (RMS) voltage of a sinusoidal AC waveform, in volts. The result is its peak voltage.',
    },
    acPeakVoltageToRms: {
        voltagePeak: 'Maximum voltage of a sinusoidal AC waveform, in volts. The result is its effective RMS voltage.',
    },
    acRmsCurrentToPeak: {
        currentRms: 'Effective (RMS) current of a sinusoidal AC waveform, in amperes. The result is its peak current.',
    },
    acPeakCurrentToRms: {
        currentPeak: 'Maximum current of a sinusoidal AC waveform, in amperes. The result is its effective RMS current.',
    },
    singlePhaseAcApparentPower: {
        voltageRms: 'Single-phase AC supply voltage measured in RMS volts.',
        currentRms: 'Single-phase AC load current measured in RMS amperes.',
    },
    threePhaseAcApparentPower: {
        lineVoltageRms: 'Balanced three-phase line-to-line supply voltage in RMS volts.',
        lineCurrentRms: 'Balanced three-phase line current in RMS amperes.',
    },
    singlePhaseAcRealPower: {
        voltageRms: 'Single-phase AC supply voltage measured in RMS volts.',
        currentRms: 'Single-phase AC load current measured in RMS amperes.',
        powerFactor: 'Fraction of single-phase apparent power that is real/useful power, from 0 to 1.',
    },
    threePhaseAcRealPower: {
        lineVoltageRms: 'Balanced three-phase line-to-line supply voltage in RMS volts.',
        lineCurrentRms: 'Balanced three-phase line current in RMS amperes.',
        powerFactor: 'Fraction of balanced three-phase apparent power that is real/useful power, from 0 to 1.',
    },
    singlePhaseAcReactivePower: {
        voltageRms: 'Single-phase AC supply voltage measured in RMS volts.',
        currentRms: 'Single-phase AC load current measured in RMS amperes.',
        powerFactor: 'Ratio of real power to apparent power, from 0 to 1. The result is reactive-power magnitude only.',
    },
    threePhaseAcReactivePower: {
        lineVoltageRms: 'Balanced three-phase line-to-line supply voltage in RMS volts.',
        lineCurrentRms: 'Balanced three-phase line current in RMS amperes.',
        powerFactor: 'Ratio of real power to apparent power, from 0 to 1. The result is reactive-power magnitude only.',
    },
    singlePhaseAcPowerFactor: {
        realPowerWatts: 'Single-phase AC real power delivered to the load, in watts (W).',
        voltageRms: 'Single-phase AC supply voltage measured in RMS volts.',
        currentRms: 'Single-phase AC load current measured in RMS amperes.',
    },
    threePhaseAcPowerFactor: {
        realPowerWatts: 'Total balanced three-phase real power delivered to the load, in watts (W).',
        lineVoltageRms: 'Balanced three-phase line-to-line supply voltage in RMS volts.',
        lineCurrentRms: 'Balanced three-phase line current in RMS amperes.',
    },
    seriesRlcImpedanceOhms: {
        resistanceOhms: 'Resistance of the series circuit in ohms (Ω).',
        inductanceHenries: 'Inductance of the series circuit in henries (H). If your component is labeled in mH, divide that number by 1,000; for example, 2.8 mH = 0.0028 H.',
        capacitanceFarads: 'Capacitance of the series circuit in farads (F). Convert µF to F by dividing by 1,000,000.',
        frequencyHz: 'Frequency of the AC source connected to the series RLC circuit, in hertz (Hz).',
    },
    seriesRlcCurrentAmps: {
        voltageRms: 'RMS AC source voltage applied to the series RLC circuit, in volts.',
        resistanceOhms: 'Resistance in the series RLC circuit, in ohms (Ω).',
        inductanceHenries: 'Inductance in the series RLC circuit, in henries (H). Convert a datasheet value in mH to H by dividing by 1,000.',
        capacitanceFarads: 'Capacitance in the series RLC circuit, in farads (F). Convert µF to F by dividing by 1,000,000.',
        frequencyHz: 'AC source frequency for the series RLC circuit, in hertz (Hz).',
    },
    seriesRlcPowerFactor: {
        resistanceOhms: 'Resistance in the series RLC circuit, in ohms (Ω).',
        inductanceHenries: 'Inductance in the series RLC circuit, in henries (H). Convert a datasheet value in mH to H by dividing by 1,000.',
        capacitanceFarads: 'Capacitance in the series RLC circuit, in farads (F). Convert µF to F by dividing by 1,000,000.',
        frequencyHz: 'AC source frequency for the series RLC circuit, in hertz (Hz).',
    },
    seriesRlcPhaseAngleRadians: {
        resistanceOhms: 'Resistance in the series RLC circuit, in ohms (Ω).',
        inductanceHenries: 'Inductance in the series RLC circuit, in henries (H). Convert a datasheet value in mH to H by dividing by 1,000.',
        capacitanceFarads: 'Capacitance in the series RLC circuit, in farads (F). Convert µF to F by dividing by 1,000,000.',
        frequencyHz: 'AC source frequency for the series RLC circuit, in hertz (Hz).',
    },
    inductiveReactanceOhms: {
        inductanceHenries: 'Inductor value in henries (H). If the component is labeled in mH, divide that number by 1,000 before entering it.',
        frequencyHz: 'Frequency of the AC signal through the inductor, in hertz (Hz).',
    },
    capacitiveReactanceOhms: {
        capacitanceFarads: 'Capacitor value in farads (F). Convert the common µF rating to F by dividing by 1,000,000.',
        frequencyHz: 'Frequency of the AC signal through the capacitor, in hertz (Hz).',
    },
    lcResonantFrequencyHz: {
        inductanceHenries: 'Inductor value in henries (H). Convert a component rating in mH to H by dividing by 1,000.',
        capacitanceFarads: 'Capacitor value in farads (F). Convert µF to F by dividing by 1,000,000.',
    },
    inductorEnergyJoules: {
        inductanceHenries: 'Inductor value in henries (H). Convert a component rating in mH to H by dividing by 1,000.',
        currentAmps: 'Current flowing through the inductor, in amperes (A).',
    },
    capacitorEnergyJoules: {
        capacitanceFarads: 'Capacitor value in farads (F). Convert µF to F by dividing by 1,000,000.',
        voltage: 'Voltage across the capacitor, in volts (V), at the moment its stored energy is being calculated.',
    },
    inductanceFromVoltageAndCurrentRamp: {
        voltage: 'Voltage applied across the inductor while current is changing, in volts (V).',
        currentChangeAmps: 'Measured change in inductor current during the ramp, in amperes (A).',
        timeSeconds: 'Time taken for the measured current change, in seconds (s).',
    },
    capacitanceFromCurrentAndVoltageRamp: {
        currentAmps: 'Current flowing into or out of the capacitor during the ramp, in amperes (A).',
        voltageChange: 'Measured change in capacitor voltage during the ramp, in volts (V).',
        timeSeconds: 'Time taken for the measured voltage change, in seconds (s).',
    },
    estimateStepperSupplyCurrent: {
        supplyVoltage: 'DC voltage supplied to the stepper driver, in volts (V). The result is estimated DC supply current, not motor phase current.',
        phaseCurrentAmps: 'Motor winding (phase) current in amperes (A), typically from the motor/driver rating. This is not the DC supply current.',
        phaseVoltage: 'Voltage across one motor winding/phase, in volts (V). Enter this OR winding resistance, not both.',
        windingResistanceOhms: 'Resistance of one motor winding/phase, in ohms (Ω). Enter this OR phase voltage, not both.',
        energizedPhases: 'Number of motor phases assumed to draw power at once: 1 or 2. The estimate defaults to 2.',
        driverEfficiency: 'Estimated driver efficiency as a fraction from greater than 0 to 1; for example, 0.9 means 90%.',
    },
    estimateDcSupplyCurrent: {
        supplyVoltage: 'DC supply output voltage, in volts (V).',
        loadPowerWatts: 'Power for one load group, in watts (W). Leave blank and enter load voltage and current instead.',
        loadVoltage: 'Voltage across each load, in volts (V), used with load current when load power is blank.',
        loadCurrentAmps: 'Current per load, in amperes (A), used with load voltage when load power is blank.',
        loadQuantity: 'Number of identical loads represented by this load group.',
        efficiency: 'PSU efficiency as a fraction greater than 0 and at most 1; for example, 0.85 means 85%.',
    },
    electricalPowerFromShaft: {
        shaftPowerWatts: 'Mechanical power delivered at the motor shaft, in watts (W).',
        motorDriveEfficiency: 'Estimated combined motor and drive efficiency as a fraction greater than 0 and at most 1. Replace the default with manufacturer data when available.',
    },
    awgToSquareMillimeters: {
        awg: 'American Wire Gauge size from 0 to 40. Smaller AWG numbers indicate thicker wire; the result is conductor area in mm².',
    },
    dcPowerWatts: {
        voltage: 'DC voltage across the load, in volts (V). This formula calculates DC power as voltage × current.',
        current: 'DC current drawn by the load, in amperes (A). This formula calculates DC power as voltage × current.',
    },
    maxFeedRateByFrequency: {
        controllerHz: 'Controller’s maximum step-pulse rate, in pulses per second (Hz). Check the controller or firmware specification.',
        stepsOrCountsPerMm: 'Axis steps or encoder counts required to travel 1 mm. Higher resolution lowers the calculated maximum feed rate.',
    },
    cylinderInertia: {
        massKg: 'Mass of the rotating cylindrical part, in kilograms (kg).',
        radiusMeter: 'Radius of the cylinder from its rotation axis to its outer surface, in meters. Use half the diameter.',
    },
    reflectedLinearLoadInertia: {
        totalMovingMassKg: 'Total mass that moves with this axis (gantry, carriage, workpiece, and attached hardware), in kilograms.',
        screwLeadMeter: 'Linear travel of the screw per revolution, in meters (for example, 5 mm = 0.005 m).',
        gearRatio: 'Motor revolutions per screw revolution. Enter 1 for direct drive; a 3:1 reduction is entered as 3.',
    },
    getInertiaRatio: {
        totalLoadInertia: 'Total load inertia reflected to the motor shaft, in kg·m². Include the driven parts and transmission.',
        motorInertia: 'Rotor inertia of the selected motor, in kg·m², from its datasheet.',
    },
    requiredTorqueForThrust: {
        targetThrustNewton: 'Linear force the motor/screw must produce, including cutting and friction forces, in newtons (N).',
        screwLeadMeter: 'Screw travel per revolution in meters (for example, 5 mm = 0.005 m). Smaller lead generally requires less torque for the same force.',
        efficiency: 'Mechanical efficiency of the screw drive: the fraction of motor torque converted into useful linear force. Enter 0–1 (for example, 0.85 for 85%).',
    },
    torqueAndRpmToWatts: {
        torqueNm: 'Rotational torque at the shaft, in newton-meters (N·m).',
        rpm: 'Shaft rotational speed in revolutions per minute (rpm).',
    },
    calibrateSteps: {
        currentSteps: 'Current controller setting in steps or counts per unit of distance.',
        commandedDistance: 'Distance the controller was told to move. Use the machine’s configured distance unit.',
        actualDistance: 'Distance the axis physically moved, measured in the same units as commandedDistance.',
    },
    dcWireVoltageDrop: {
        supplyVoltage: 'DC power-supply voltage at the start of the wire run, in volts (V).',
        current: 'Current flowing through the wire to the load, in amperes (A).',
        oneWayLengthMeters: 'Distance from the supply to the load, in meters. Enter the one-way distance; the calculation accounts for the return wire.',
        conductorAreaMm2: 'Cross-sectional area of one conductor in square millimeters (mm²). Use the cable specification or calculate it from the wire gauge.',
        material: 'Conductor material. Copper and aluminum have different electrical resistance.',
    },
};

function getFunctionArgs(func, formulaName) {
    const registeredParameters = formulaParameterRegistry[formulaName]?.inputs;
    if (registeredParameters) {
        return registeredParameters.map((name) => ({
            name,
            defaultValue: optionalFormulaParameters.has(`${formulaName}.${name}`)
                ? null
                : formulaParameterDefaults[`${formulaName}.${name}`] ?? 0,
            optional: optionalFormulaParameters.has(`${formulaName}.${name}`),
        }));
    }

    const source = func.toString();
    const openingParen = source.indexOf('(');
    if (openingParen < 0) return null;

    let depth = 0;
    let quote = null;
    let escaped = false;
    let closingParen = -1;
    for (let index = openingParen; index < source.length; index += 1) {
        const character = source[index];
        const nextCharacter = source[index + 1];
        if (quote) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === quote) quote = null;
            continue;
        }
        if (character === '"' || character === "'" || character === '`') {
            quote = character;
        } else if (character === '/' && nextCharacter === '*') {
            const commentEnd = source.indexOf('*/', index + 2);
            if (commentEnd < 0) return null;
            index = commentEnd + 1;
        } else if (character === '/' && nextCharacter === '/') {
            const commentEnd = source.indexOf('\n', index + 2);
            if (commentEnd < 0) break;
            index = commentEnd;
        } else if (character === '(') {
            depth += 1;
        } else if (character === ')') {
            depth -= 1;
            if (depth === 0) {
                closingParen = index;
                break;
            }
        }
    }
    if (closingParen < 0) return null;

    const parameterList = source.slice(openingParen + 1, closingParen).trim();
    if (!parameterList) return [];
    const parameterParts = [];
    let start = 0;
    let parentheses = 0;
    let brackets = 0;
    let braces = 0;
    quote = null;
    escaped = false;
    for (let index = 0; index < parameterList.length; index += 1) {
        const character = parameterList[index];
        const nextCharacter = parameterList[index + 1];
        if (quote) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === quote) quote = null;
            continue;
        }
        if (character === '"' || character === "'" || character === '`') {
            quote = character;
        } else if (character === '/' && nextCharacter === '*') {
            const commentEnd = parameterList.indexOf('*/', index + 2);
            if (commentEnd < 0) return null;
            index = commentEnd + 1;
        } else if (character === '/' && nextCharacter === '/') {
            const commentEnd = parameterList.indexOf('\n', index + 2);
            if (commentEnd < 0) break;
            index = commentEnd;
        } else if (character === '(') {
            parentheses += 1;
        } else if (character === ')') {
            parentheses -= 1;
        } else if (character === '[') {
            brackets += 1;
        } else if (character === ']') {
            brackets -= 1;
        } else if (character === '{') {
            braces += 1;
        } else if (character === '}') {
            braces -= 1;
        } else if (
            character === ',' &&
            parentheses === 0 &&
            brackets === 0 &&
            braces === 0
        ) {
            parameterParts.push(parameterList.slice(start, index).trim());
            start = index + 1;
        }
    }
    parameterParts.push(parameterList.slice(start).trim());

    const parameters = parameterParts
        .filter((parameter) => parameter.length > 0)
        .map((parameter) => {
        const match = parameter.trim().match(
            /^([A-Za-z_$][\w$]*)(?:\s*=\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?))?$/i,
        );
        if (!match) return null;
        return { name: match[1], defaultValue: match[2] === undefined ? 0 : Number(match[2]) };
    });
    return parameters.some((parameter) => parameter === null) ? null : parameters;
}

const formulaArguments = new Map(
    Object.entries(CncHardwareMath)
        .filter(([name, formula]) => !excludedFormulas.has(name) && typeof formula === 'function')
        .map(([name, formula]) => [name, getFunctionArgs(formula, name)])
        .filter(([, args]) => args !== null),
);
const availableFormulas = [...formulaArguments.keys()];
const graphProfiles = {
    requiredTorqueForThrust: {
        input: 'targetThrustNewton',
        min: 0,
        max: 2500,
        samples: 26,
        xLabel: 'Required machine thrust force (N)',
        yLabel: 'Required motor torque (N·m)',
    },
    estimateDcSupplyCurrent: {
        input: 'loadPowerWatts',
        min: 0,
        max: 1000,
        samples: 51,
        xLabel: 'Load power (W)',
        yLabel: 'Estimated supply current (A)',
    },
    electricalPowerFromShaft: {
        input: 'shaftPowerWatts',
        min: 0,
        max: 1500,
        samples: 40,
        xLabel: 'Mechanical shaft power (W)',
        yLabel: 'Estimated electrical input power (W)',
    },
    estimateStepperSupplyCurrent: {
        input: 'supplyVoltage',
        min: 12,
        max: 48,
        samples: 51,
        xLabel: 'Driver supply voltage (V)',
        yLabel: 'Estimated supply current (A)',
    },
    reflectedLinearLoadInertia: {
        input: 'totalMovingMassKg',
        min: 5,
        max: 150,
        samples: 30,
        xLabel: 'Total moving-axis gantry mass (kg)',
        yLabel: 'Reflected load inertia (kg·m²)',
    },
};
const graphInputProfiles = {
    frequencyHz: {
        min: 10,
        max: 1000,
        xLabel: 'Frequency (Hz)',
    },
    inductanceMh: {
        min: 0.5,
        max: 10,
        xLabel: 'Inductance (mH)',
    },
    inductanceHenries: {
        min: 0.001,
        max: 0.1,
        xLabel: 'Inductance (H)',
    },
    stepsOrCountsPerMm: {
        min: 10,
        max: 2000,
        xLabel: 'Steps or counts per millimeter',
    },
    rpm: {
        min: 0,
        max: 3000,
        xLabel: 'Rotational speed (rpm)',
    },
};

function getGraphProfile(formulaName, inputName) {
    const formulaProfile = graphProfiles[formulaName];
    if (formulaProfile?.input === inputName) return formulaProfile;
    return graphInputProfiles[inputName] ?? null;
}

const addBtn = document.getElementById('add-formula-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const voltageDropThresholdInput = document.getElementById('voltage-drop-threshold');
const voltageDropThresholdStatus = document.getElementById('voltage-drop-threshold-status');
const canvas = document.getElementById('formula-canvas');
const pipelineGraphs = document.getElementById('pipeline-graphs');
const pipelineGraphsContainer = document.getElementById('pipeline-graphs-container');
const placeholder = document.getElementById('canvas-placeholder');
const varContainer = document.getElementById('variables-container');

addBtn.addEventListener('click', () => createFormulaBlock());
exportBtn.addEventListener('click', exportTimelineConfiguration);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', importTimelineConfiguration);
voltageDropThresholdInput.addEventListener('input', evaluatePipeline);
initializeReferenceCharts();
initializeQuickUnitConverter();

function initializeQuickUnitConverter() {
    const dimensionSelect = document.getElementById('quick-converter-dimension');
    const valueInput = document.getElementById('quick-converter-value');
    const unitSelect = document.getElementById('quick-converter-unit');
    const resultsBody = document.getElementById('quick-converter-results');
    const status = document.getElementById('quick-converter-status');
    const dimensionGroups = [
        {
            label: 'Geometry and motion',
            dimensions: [
                ['length', 'Length'],
                ['area', 'Area'],
                ['volume', 'Volume'],
                ['speed', 'Speed'],
                ['angle', 'Angle'],
            ],
        },
        {
            label: 'Temperature',
            dimensions: [['temperature', 'Temperature']],
        },
        {
            label: 'Electrical',
            dimensions: [
                ['voltage', 'Voltage'],
                ['current', 'Current'],
                ['resistance', 'Resistance'],
                ['power', 'Real power'],
                ['apparentPower', 'Apparent power'],
                ['reactivePower', 'Reactive power'],
                ['frequency', 'Frequency'],
                ['energy', 'Energy'],
                ['inductance', 'Inductance'],
                ['capacitance', 'Capacitance'],
            ],
        },
        {
            label: 'Mechanical',
            dimensions: [
                ['force', 'Force'],
                ['torque', 'Torque'],
                ['mass', 'Weight / mass'],
                ['pressure', 'Pressure'],
            ],
        },
    ];
    const dimensionLabels = new Map(dimensionGroups.flatMap(({dimensions}) => dimensions));
    const quickConverterUnitOptions = {
        ...resultUnitOptions,
        length: {
            ...resultUnitOptions.length,
            units: [
                ...resultUnitOptions.length.units,
                {label: 'km', toBase: 1000},
                {label: 'Thou (0.001 in)', toBase: 0.0000254},
                {label: 'Tenth (0.0001 in)', toBase: 0.00000254},
                {label: 'mile', toBase: 1609.344},
                {label: 'yd', toBase: 0.9144},
            ],
        },
        mass: {
            ...resultUnitOptions.mass,
            units: [
                {label: 'mg', toBase: 1e-6},
                ...resultUnitOptions.mass.units,
                {label: 'oz', toBase: 0.028349523125},
                {label: 'metric tonne', toBase: 1000},
                {label: 'long ton (UK)', toBase: 1016.0469088},
                {label: 'short ton (US)', toBase: 907.18474},
                {label: 'grain', toBase: 0.00006479891},
            ],
        },
        area: {
            ...resultUnitOptions.area,
            units: [
                ...resultUnitOptions.area.units,
                {label: 'ft²', toBase: 0.09290304},
                {label: 'yd²', toBase: 0.83612736},
                {label: 'acre', toBase: 4046.8564224},
                {label: 'are (a)', toBase: 100},
                {label: 'hectare (ha)', toBase: 10000},
                {label: '坪 (tsubo)', toBase: 3.305785123966942},
            ],
        },
        volume: {
            default: 'L',
            units: [
                {label: 'm³', toBase: 1},
                {label: 'mm³', toBase: 1e-9},
                {label: 'in³', toBase: 0.000016387064},
                {label: 'ft³', toBase: 0.028316846592},
                {label: 'yd³', toBase: 0.764554857984},
                {label: 'L', toBase: 0.001},
                {label: 'mL (cc)', toBase: 1e-6},
                {label: 'oil barrel (bbl)', toBase: 0.158987294928},
                {label: 'US gal', toBase: 0.003785411784},
                {label: 'US fl oz', toBase: 0.0000295735295625},
                {label: 'US pt (liquid)', toBase: 0.000473176473},
                {label: 'US pt (dry)', toBase: 0.0005506104713575},
                {label: 'Japanese shō (升)', toBase: 0.0018},
                {label: 'Japanese gō (合)', toBase: 0.00018},
                {label: 'UK pt', toBase: 0.00056826125},
            ],
        },
        angle: {
            ...resultUnitOptions.angle,
            units: [
                ...resultUnitOptions.angle.units,
                {label: 'arcsec', toBase: Math.PI / (180 * 60 * 60)},
                {label: 'arcmin', toBase: Math.PI / (180 * 60)},
                {label: 'rev', toBase: 2 * Math.PI},
                {label: 'µm/m', toBase: 1e-6},
            ],
        },
        temperature: {
            default: '°C',
            units: [
                {label: '°C', toBase: 1, offset: 273.15},
                {label: '°F', toBase: 5 / 9, offset: 255.3722222222222},
                {label: 'K', toBase: 1, offset: 0},
            ],
        },
        torque: {
            ...resultUnitOptions.torque,
            units: [
                ...resultUnitOptions.torque.units,
                {label: 'kgf·cm', toBase: 0.0980665},
                {label: 'kgf·m', toBase: 9.80665},
                {label: 'ozf·in', toBase: 0.007061551814226044},
            ],
        },
        force: {
            ...resultUnitOptions.force,
            units: [
                ...resultUnitOptions.force.units,
                {label: 'kN', toBase: 1000},
                {label: 'kgf', toBase: 9.80665},
                {label: 'gf', toBase: 0.00980665},
                {label: 'ozf', toBase: 0.2780138509537813},
            ],
        },
        pressure: {
            default: 'Pa',
            units: [
                {label: 'Pa', toBase: 1},
                {label: 'MPa', toBase: 1e6},
                {label: 'bar', toBase: 1e5},
                {label: 'atm', toBase: 101325},
                {label: 'kgf/cm² (at)', toBase: 98066.5},
                {label: 'mmHg (Torr)', toBase: 101325 / 760},
                {label: 'PSI (lbf/in²)', toBase: 6894.757293168},
            ],
        },
        speed: {
            ...resultUnitOptions.speed,
            units: [
                ...resultUnitOptions.speed.units,
                {label: 'm/s', toBase: 60},
                {label: 'km/h', toBase: 1000 / 60},
                {label: 'ft/s', toBase: 18.288},
                {label: 'mi/h', toBase: 26.8224},
                {label: 'knot', toBase: 30.866666666666667},
            ],
        },
    };

    dimensionGroups.forEach(({label, dimensions}) => {
        const group = document.createElement('optgroup');
        group.label = label;
        dimensions.forEach(([dimension, name]) => {
            const option = document.createElement('option');
            option.value = dimension;
            option.textContent = name;
            group.append(option);
        });
        dimensionSelect.append(group);
    });

    dimensionSelect.addEventListener('change', updateUnits);
    valueInput.addEventListener('input', updateResults);
    unitSelect.addEventListener('change', updateResults);
    dimensionSelect.value = 'length';
    updateUnits();

    function getUnits() {
        return quickConverterUnitOptions[dimensionSelect.value].units;
    }

    function updateUnits() {
        unitSelect.replaceChildren();
        getUnits().forEach(({label}) => {
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            unitSelect.append(option);
        });
        unitSelect.value = quickConverterUnitOptions[dimensionSelect.value].default;
        updateResults();
    }

    function updateResults() {
        const value = valueInput.valueAsNumber;
        const units = getUnits();
        const sourceUnit = units.find(({label}) => label === unitSelect.value);
        resultsBody.replaceChildren();

        if (!Number.isFinite(value) || !sourceUnit) {
            status.textContent = 'Enter a valid number to see conversions.';
            return;
        }

        const baseValue = value * sourceUnit.toBase + (sourceUnit.offset ?? 0);
        status.textContent = `Showing ${formatQuickConversionValue(value)} ${sourceUnit.label} in all ${dimensionLabels.get(dimensionSelect.value).toLowerCase()} units.`;
        units.forEach(({label, toBase, offset = 0}) => {
            const row = document.createElement('tr');
            const unitCell = document.createElement('th');
            const valueCell = document.createElement('td');
            unitCell.scope = 'row';
            unitCell.className = 'px-3 py-2 font-medium';
            unitCell.textContent = label;
            valueCell.className = 'px-3 py-2 text-right font-mono tabular-nums';
            valueCell.textContent = formatQuickConversionValue((baseValue - offset) / toBase);
            row.append(unitCell, valueCell);
            resultsBody.append(row);
        });
    }
}

function formatQuickConversionValue(value) {
    if (value === 0) return '0';
    return value.toLocaleString(undefined, {maximumSignificantDigits: 8});
}

function initializeReferenceCharts() {
    const angleUnitSystem = document.getElementById('angle-unit-system');
    const angleRadius = document.getElementById('angle-radius');
    const angleMaxDegrees = document.getElementById('angle-max-degrees');
    const angleInputUnit = document.getElementById('angle-input-unit');
    const angleOutputUnit = document.getElementById('angle-output-unit');
    const angleDurationSeconds = document.getElementById('angle-duration-seconds');
    const resolutionUnitSystem = document.getElementById('resolution-unit-system');
    const resolutionMotorType = document.getElementById('resolution-motor-type');
    const resolutionDriveType = document.getElementById('resolution-drive-type');
    const resolutionMotorSteps = document.getElementById('resolution-motor-steps');
    const resolutionMicrosteps = document.getElementById('resolution-microsteps');
    const resolutionEncoderPpr = document.getElementById('resolution-encoder-ppr');
    const resolutionGearRatio = document.getElementById('resolution-gear-ratio');
    const resolutionRangeMin = document.getElementById('resolution-range-min');
    const resolutionRangeMax = document.getElementById('resolution-range-max');
    const resolutionPulleyTeeth = document.getElementById('resolution-pulley-teeth');
    const angleChart = document.getElementById('angle-tolerance-chart');
    const angleStatus = document.getElementById('angle-chart-status');
    const angleTimeChart = document.getElementById('angle-time-chart');
    const angleTimeStatus = document.getElementById('angle-time-status');
    const resolutionChart = document.getElementById('resolution-chart');
    const resolutionStatus = document.getElementById('resolution-chart-status');

    const refresh = () => {
        updateReferenceChartControls();
        drawAngleToleranceChart();
        drawAxisResolutionChart();
    };

    [
        angleRadius,
        angleMaxDegrees,
        angleDurationSeconds,
        resolutionMotorType,
        resolutionDriveType,
        resolutionMotorSteps,
        resolutionMicrosteps,
        resolutionEncoderPpr,
        resolutionGearRatio,
        resolutionRangeMin,
        resolutionRangeMax,
        resolutionPulleyTeeth,
    ].forEach((input) => {
        input.addEventListener('input', refresh);
        input.addEventListener('change', refresh);
    });
    angleInputUnit.addEventListener('change', refresh);
    angleOutputUnit.addEventListener('change', refresh);

    angleUnitSystem.addEventListener('change', () => {
        convertChartLengthInput(angleRadius, angleUnitSystem.dataset.previousUnit, angleUnitSystem.value);
        angleUnitSystem.dataset.previousUnit = angleUnitSystem.value;
        refresh();
    });
    resolutionUnitSystem.addEventListener('change', () => {
        const previousUnit = resolutionUnitSystem.dataset.previousUnit;
        convertChartLengthInput(resolutionRangeMin, previousUnit, resolutionUnitSystem.value);
        convertChartLengthInput(resolutionRangeMax, previousUnit, resolutionUnitSystem.value);
        resolutionUnitSystem.dataset.previousUnit = resolutionUnitSystem.value;
        refresh();
    });

    window.addEventListener('resize', () => {
        drawAngleToleranceChart();
        drawAxisResolutionChart();
    });

    angleUnitSystem.dataset.previousUnit = angleUnitSystem.value;
    resolutionUnitSystem.dataset.previousUnit = resolutionUnitSystem.value;

    function convertChartLengthInput(input, fromUnit, toUnit) {
        if (fromUnit === toUnit || !Number.isFinite(input.valueAsNumber)) return;
        const fromMillimeters = fromUnit === 'inch' ? 25.4 : 1;
        const toMillimeters = toUnit === 'inch' ? 25.4 : 1;
        input.value = (input.valueAsNumber * fromMillimeters / toMillimeters).toPrecision(12);
    }

    function updateReferenceChartControls() {
        const angleUnit = angleUnitSystem.value === 'inch' ? 'in' : 'mm';
        document.querySelectorAll('[data-angle-length-unit]').forEach((element) => {
            element.textContent = angleUnit;
        });
        document.querySelectorAll('[data-angle-unit-symbol]').forEach((element) => {
            element.textContent = angleInputUnit.value === 'arcseconds' ? '″' : '°';
        });
        const resolutionUnit = resolutionUnitSystem.value === 'inch' ? 'in' : 'mm';
        const driveType = resolutionDriveType.value;
        document.querySelectorAll('[data-resolution-range-label]').forEach((element, index) => {
            const rangeName = driveType === 'belt' ? 'Belt pitch' : 'Screw lead';
            element.textContent = `${index === 0 ? 'Minimum' : 'Maximum'} ${rangeName.toLowerCase()} (${resolutionUnit})`;
        });
        document.querySelectorAll('.resolution-stepper-field').forEach((element) => {
            element.hidden = resolutionMotorType.value !== 'stepper';
        });
        document.querySelectorAll('.resolution-servo-field').forEach((element) => {
            element.hidden = resolutionMotorType.value !== 'servo';
        });
        document.querySelectorAll('.resolution-gear-field').forEach((element) => {
            element.hidden = driveType !== 'geared';
        });
        document.querySelectorAll('.resolution-pulley-field').forEach((element) => {
            element.hidden = driveType !== 'belt';
        });
    }

    function drawAngleToleranceChart() {
        const radius = angleRadius.valueAsNumber;
        const maxAngle = angleMaxDegrees.valueAsNumber;
        const durationSeconds = angleDurationSeconds.valueAsNumber;
        if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(maxAngle) || maxAngle <= 0) {
            clearGraph(angleChart);
            clearGraph(angleTimeChart);
            angleStatus.textContent = 'Enter a radius and maximum angle greater than zero.';
            angleTimeStatus.textContent = '';
            return;
        }
        const isArcseconds = angleInputUnit.value === 'arcseconds';
        const angleUnit = isArcseconds ? 'arcseconds' : 'degrees';
        const angleSymbol = isArcseconds ? '″' : '°';
        const radiansPerAngleUnit = isArcseconds ? Math.PI / (180 * 60 * 60) : Math.PI / 180;
        const radiusMeters = radius * (angleUnitSystem.value === 'inch' ? 0.0254 : 0.001);
        const outputUnit = angleOutputUnit.value;
        const metersPerOutputUnit = {
            nm: 1e-9,
            'µm': 1e-6,
            mm: 1e-3,
            cm: 1e-2,
            m: 1,
            km: 1e3,
        }[outputUnit];
        const finalMovement = (radiusMeters * maxAngle * radiansPerAngleUnit) / metersPerOutputUnit;
        const points = Array.from({length: 41}, (_, index) => {
            const angle = (maxAngle * index) / 40;
            return {
                x: angle,
                y: (radiusMeters * angle * radiansPerAngleUnit) / metersPerOutputUnit,
            };
        });
        const angleAxisLabel = `Angle error (${angleUnit})`;
        const movementAxisLabel = `Linear tolerance (${outputUnit})`;
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
            clearGraph(angleTimeChart);
            drawSweepGraph(
                angleChart,
                points,
                angleAxisLabel,
                movementAxisLabel,
            );
            angleStatus.textContent = `${formatEngineeringValue(maxAngle)}${angleSymbol} at a ${formatEngineeringValue(radius)} ${angleUnitSystem.value === 'inch' ? 'in' : 'mm'} radius gives ${formatEngineeringValue(finalMovement)} ${outputUnit} linear tolerance.`;
            angleTimeStatus.textContent = 'Enter a positive time in seconds.';
            return;
        }
        const averageLinearSpeed = finalMovement / durationSeconds;
        drawSweepGraph(
            angleChart,
            points,
            angleAxisLabel,
            movementAxisLabel,
        );
        angleStatus.textContent = `${formatEngineeringValue(maxAngle)}${angleSymbol} at a ${formatEngineeringValue(radius)} ${angleUnitSystem.value === 'inch' ? 'in' : 'mm'} radius gives ${formatEngineeringValue(finalMovement)} ${outputUnit} linear tolerance. Average speed over ${formatEngineeringValue(durationSeconds)} seconds: ${formatEngineeringValue(averageLinearSpeed)} ${outputUnit}/s.`;

        const timePoints = Array.from({length: 41}, (_, index) => {
            const timeSeconds = (durationSeconds * index) / 40;
            return {
                x: timeSeconds,
                y: finalMovement * (timeSeconds / durationSeconds),
            };
        });
        drawSweepGraph(
            angleTimeChart,
            timePoints,
            'Time (seconds)',
            movementAxisLabel,
        );
        angleTimeStatus.textContent = `Estimated average speed: ${formatEngineeringValue(averageLinearSpeed)} ${outputUnit} per second.`;
    }

    function drawAxisResolutionChart() {
        const minimum = resolutionRangeMin.valueAsNumber;
        const maximum = resolutionRangeMax.valueAsNumber;
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= minimum) {
            clearGraph(resolutionChart);
            resolutionStatus.textContent = 'Enter a positive minimum and a larger maximum for lead or belt pitch.';
            return;
        }

        const motorType = resolutionMotorType.value;
        const driveType = resolutionDriveType.value;
        const motorSteps = resolutionMotorSteps.valueAsNumber;
        const microsteps = resolutionMicrosteps.valueAsNumber;
        const encoderPpr = resolutionEncoderPpr.valueAsNumber;
        const gearRatio = resolutionGearRatio.valueAsNumber;
        const pulleyTeeth = resolutionPulleyTeeth.valueAsNumber;
        let pulsesPerMotorTurn;
        if (motorType === 'stepper') {
            if (!Number.isInteger(motorSteps) || motorSteps <= 0 || !Number.isInteger(microsteps) || microsteps <= 0) {
                clearGraph(resolutionChart);
                resolutionStatus.textContent = 'Enter positive whole numbers for motor steps and microsteps.';
                return;
            }
            pulsesPerMotorTurn = motorSteps * microsteps;
        } else {
            if (!Number.isFinite(encoderPpr) || encoderPpr <= 0) {
                clearGraph(resolutionChart);
                resolutionStatus.textContent = 'Enter a positive encoder pulse count (PPR).';
                return;
            }
            pulsesPerMotorTurn = encoderPpr * 4;
        }
        if (
            (driveType === 'geared' && (!Number.isFinite(gearRatio) || gearRatio <= 0)) ||
            (driveType === 'belt' && (!Number.isInteger(pulleyTeeth) || pulleyTeeth <= 0))
        ) {
            clearGraph(resolutionChart);
            resolutionStatus.textContent = driveType === 'belt'
                ? 'Enter a positive whole number for pulley teeth.'
                : 'Enter a motor-to-screw ratio greater than zero.';
            return;
        }

        const ratio = driveType === 'geared' ? gearRatio : 1;
        const isInches = resolutionUnitSystem.value === 'inch';
        const distanceUnit = isInches ? 'in' : 'mm';
        const outputUnit = motorType === 'stepper'
            ? `steps/${distanceUnit}`
            : `counts/${distanceUnit}`;
        const points = Array.from({length: 41}, (_, index) => {
            const travelPerTurn = minimum + ((maximum - minimum) * index) / 40;
            const pulsesPerDistance = driveType === 'belt'
                ? pulsesPerMotorTurn / (travelPerTurn * pulleyTeeth)
                : (pulsesPerMotorTurn * ratio) / travelPerTurn;
            return {x: travelPerTurn, y: pulsesPerDistance};
        });
        drawSweepGraph(
            resolutionChart,
            points,
            driveType === 'belt'
                ? `Belt pitch (${distanceUnit} per tooth)`
                : `Screw lead (${distanceUnit} per turn)`,
            `Axis resolution (${outputUnit})`,
        );
        const minimumResolution = points[0].y;
        const maximumResolution = points.at(-1).y;
        const driveDescription = motorType === 'stepper'
            ? `${motorSteps} motor steps × ${microsteps} microsteps`
            : `${encoderPpr} encoder PPR × 4 quadrature counts`;
        const transmissionDescription = driveType === 'geared'
            ? ` and a ${formatEngineeringValue(gearRatio)}:1 motor-to-screw ratio`
            : driveType === 'belt'
                ? ` and a ${pulleyTeeth}-tooth pulley`
                : ' with direct drive';
        const rangeDescription = driveType === 'belt' ? 'belt pitch' : 'screw lead';
        resolutionStatus.textContent = `Using ${driveDescription}${transmissionDescription}. At ${formatEngineeringValue(minimum)} ${distanceUnit} ${rangeDescription}: ${formatEngineeringValue(minimumResolution)} ${outputUnit}; at ${formatEngineeringValue(maximum)} ${distanceUnit}: ${formatEngineeringValue(maximumResolution)} ${outputUnit}.`;
    }

    refresh();
}

function createFormulaBlock(savedData = null) {
    if (availableFormulas.length === 0) {
        throw new Error('No supported numeric formulas were found in the math library.');
    }
    placeholder.classList.add('hidden');
    blockCounter += 1;
    const blockId = `block_${blockCounter}`;
    const selectedFormula = availableFormulas.includes(savedData?.selectedFormula)
        ? savedData.selectedFormula
        : availableFormulas[0];
    const parameters = formulaArguments.get(selectedFormula);
    const defaultGraphInput =
        graphProfiles[selectedFormula]?.input ?? parameters[0]?.name ?? '';
    const initialGraphInput = parameters.some(({ name }) => name === savedData?.graphInput)
        ? savedData.graphInput
        : defaultGraphInput;
    const defaultGraphProfile = getGraphProfile(selectedFormula, initialGraphInput);
    const blockState = {
        id: blockId,
        selectedFormula,
        outputVariable: typeof savedData?.outputVariable === 'string'
            ? savedData.outputVariable.replace(/[^a-zA-Z0-9_]/g, '')
            : `Result_${blockCounter}`,
        note: typeof savedData?.note === 'string' ? savedData.note : '',
        displayUnit: typeof savedData?.displayUnit === 'string'
            ? savedData.displayUnit
            : '',
        outputValue: 0,
        error: null,
        graphEnabled: Boolean(savedData?.graphEnabled ?? savedData?.showGraph),
        graphInput: initialGraphInput,
        graphMin: Number.isFinite(savedData?.graphMin ?? savedData?.sweepMin)
            ? savedData.graphMin ?? savedData.sweepMin
            : defaultGraphProfile?.min ?? 0,
        graphMax: Number.isFinite(savedData?.graphMax ?? savedData?.sweepMax)
            ? savedData.graphMax ?? savedData.sweepMax
            : defaultGraphProfile?.max ?? 10,
        graphSamples: Number.isInteger(savedData?.graphSamples ?? savedData?.sweepSamples)
            ? Math.min(500, Math.max(2, savedData.graphSamples ?? savedData.sweepSamples))
            : defaultGraphProfile?.samples ?? 51,
        accelerationMode: savedData?.accelerationMode === 'angular' ? 'angular' : 'linear',
        accelerationValue: Number.isFinite(savedData?.accelerationValue)
            ? savedData.accelerationValue
            : 0.5,
        torqueConstantNmPerAmp: Number.isFinite(savedData?.torqueConstantNmPerAmp)
            ? savedData.torqueConstantNmPerAmp
            : 0.5,
        busVoltage: Number.isFinite(savedData?.busVoltage) ? savedData.busVoltage : 48,
        motorDriveEfficiency: Number.isFinite(savedData?.motorDriveEfficiency)
            ? savedData.motorDriveEfficiency
            : 0.9,
        accelerationDurationSeconds: Number.isFinite(savedData?.accelerationDurationSeconds)
            ? savedData.accelerationDurationSeconds
            : 2,
        decelerationDurationSeconds: Number.isFinite(savedData?.decelerationDurationSeconds)
            ? savedData.decelerationDurationSeconds
            : 2,
        inputs: savedData?.inputs && typeof savedData.inputs === 'object'
            ? savedData.inputs
            : {},
    };
    const savedGraphInput = savedData?.graphInput ?? savedData?.sweepTarget;
    if (parameters.some(({ name }) => name === savedGraphInput)) {
        blockState.graphInput = savedGraphInput;
    }
    activeBlocks.push(blockState);

    const blockNode = document.createElement('div');
    blockNode.className = 'min-w-0 bg-gray-900 border border-gray-800 rounded-xl p-3 shadow-lg relative transition-all duration-200 hover:border-gray-700 sm:p-5';
    blockNode.id = blockId;
    const header = document.createElement('div');
    header.className = 'flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-3 mb-4';
    const controls = document.createElement('div');
    controls.className = 'flex min-w-0 flex-wrap items-center gap-2 sm:gap-3';
    const number = document.createElement('span');
    number.className = 'bg-blue-900/40 text-blue-400 font-mono text-xs px-2.5 py-1 rounded border border-blue-800/60 font-bold';
    number.textContent = `#${blockCounter}`;
    const formulaSelect = document.createElement('select');
    formulaSelect.className = 'formula-select w-full min-w-0 max-w-full bg-gray-950 border border-gray-800 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer text-gray-200 sm:w-auto';
    formulaSelect.setAttribute('aria-label', 'Choose a calculation');
    const formulaLabel = document.createElement('label');
    formulaLabel.className = 'text-xs font-medium text-gray-400';
    formulaLabel.textContent = 'Calculate:';
    formulaLabel.htmlFor = `${blockId}-formula`;
    formulaSelect.id = `${blockId}-formula`;
    availableFormulas.forEach((formula) => {
        const option = document.createElement('option');
        option.value = formula;
        option.textContent = formulaDisplayNames[formula] ?? humanizeName(formula);
        option.selected = formula === selectedFormula;
        formulaSelect.appendChild(option);
    });
    controls.append(number, formulaLabel, formulaSelect);
    const formulaHelp = document.createElement('p');
    formulaHelp.className = 'formula-help mt-2 basis-full text-xs leading-5 text-gray-400';
    formulaHelp.textContent = formulaDescriptions[selectedFormula]
        ?? `Calculates ${formulaDisplayNames[selectedFormula] ?? humanizeName(selectedFormula)} from the values below.`;
    const outputControls = document.createElement('div');
    outputControls.className = 'flex items-center gap-2';
    const variableLabel = document.createElement('label');
    variableLabel.className = 'text-xs text-gray-400 flex items-center bg-gray-950 border border-gray-800 rounded-lg px-2';
    variableLabel.textContent = 'Result name:';
    const variableInput = document.createElement('input');
    variableInput.type = 'text';
    variableInput.className = 'output-var-input bg-transparent border-none outline-none py-1 font-mono text-blue-400 w-28 font-bold';
    variableInput.value = blockState.outputVariable;
    variableInput.setAttribute('aria-label', 'Optional result name');
    variableInput.title = 'Optional: name this result so it is easier to recognize in the variable list and Pipe menus.';
    variableLabel.appendChild(variableInput);
    const graphLabel = document.createElement('label');
    graphLabel.className = 'inline-flex items-center gap-2 cursor-pointer text-xs text-gray-400 select-none';
    const graphToggle = document.createElement('input');
    graphToggle.type = 'checkbox';
    graphToggle.className = 'graph-toggle-checkbox accent-emerald-500 rounded bg-gray-950';
    graphToggle.checked = blockState.graphEnabled;
    graphLabel.append(graphToggle, document.createTextNode('📊 Graph (advanced)'));
    const note = document.createElement('p');
    note.className = 'block-note mt-3 rounded-md border border-blue-900/60 bg-blue-950/20 px-3 py-2 text-xs leading-5 text-blue-200';
    note.textContent = blockState.note;
    note.hidden = !blockState.note;
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'text-gray-500 hover:text-red-400 p-1.5 transition-colors cursor-pointer text-sm';
    deleteButton.title = 'Remove Block';
    deleteButton.textContent = '✕';
    outputControls.append(graphLabel, variableLabel, deleteButton);
    header.append(controls, outputControls);

    const inputGrid = document.createElement('div');
    inputGrid.className = 'inputs-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    const graphWrapper = document.createElement('section');
    graphWrapper.className = 'graph-wrapper mt-4 rounded-lg border border-gray-800/60 bg-gray-950 p-4';
    graphWrapper.hidden = !blockState.graphEnabled;
    const graphHeading = document.createElement('h3');
    graphHeading.className = 'text-sm font-semibold text-gray-300';
    graphHeading.textContent = 'Parameter sweep graph';
    const graphControls = document.createElement('div');
    graphControls.className = 'mt-3 grid grid-cols-2 gap-3 md:grid-cols-4';
    const graphInput = document.createElement('select');
    graphInput.className = 'graph-input-select col-span-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
    graphInput.setAttribute('aria-label', 'Input parameter to sweep');
    const graphMin = document.createElement('input');
    graphMin.type = 'number';
    graphMin.step = 'any';
    graphMin.className = 'graph-min bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
    graphMin.value = blockState.graphMin;
    graphMin.setAttribute('aria-label', 'Sweep minimum');
    graphMin.placeholder = 'Minimum';
    const graphMax = document.createElement('input');
    graphMax.type = 'number';
    graphMax.step = 'any';
    graphMax.className = 'graph-max bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
    graphMax.value = blockState.graphMax;
    graphMax.setAttribute('aria-label', 'Sweep maximum');
    graphMax.placeholder = 'Maximum';
    const graphSamples = document.createElement('input');
    graphSamples.type = 'number';
    graphSamples.step = '1';
    graphSamples.min = '2';
    graphSamples.max = '500';
    graphSamples.className = 'graph-samples bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
    graphSamples.value = blockState.graphSamples;
    graphSamples.setAttribute('aria-label', 'Number of graph samples');
    graphSamples.placeholder = 'Samples';
    const graphMinField = document.createElement('label');
    graphMinField.className = 'space-y-1 text-xs text-gray-400';
    graphMinField.append(document.createTextNode('Sweep minimum'), graphMin);
    const graphMaxField = document.createElement('label');
    graphMaxField.className = 'space-y-1 text-xs text-gray-400';
    graphMaxField.append(document.createTextNode('Sweep maximum'), graphMax);
    const graphSamplesField = document.createElement('label');
    graphSamplesField.className = 'space-y-1 text-xs text-gray-400';
    graphSamplesField.append(document.createTextNode('Sample count'), graphSamples);
    graphControls.append(graphInput, graphMinField, graphMaxField, graphSamplesField);
    const graphHint = document.createElement('p');
    graphHint.className = 'mt-2 text-xs text-gray-500';
    graphHint.textContent = 'Sweep one input while holding the other inputs at their current values. Sample count: 2–500.';
    const graphStatus = document.createElement('p');
    graphStatus.className = 'graph-status mt-2 min-h-5 text-xs text-amber-300';
    const graphCanvas = document.createElement('canvas');
    graphCanvas.className = 'graph-canvas mt-2 block h-64 w-full';
    graphCanvas.setAttribute('role', 'img');
    graphCanvas.setAttribute('aria-label', 'Formula output versus swept input');
    const accelerationControls = document.createElement('div');
    accelerationControls.className = 'acceleration-controls mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3';
    accelerationControls.hidden = selectedFormula !== 'reflectedLinearLoadInertia';
    const accelerationMode = document.createElement('select');
    accelerationMode.className = 'acceleration-mode bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
    accelerationMode.setAttribute('aria-label', 'Acceleration input type');
    [
        ['linear', 'Linear axis acceleration (m/s²)'],
        ['angular', 'Motor angular acceleration (rad/s²)'],
    ].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = value === blockState.accelerationMode;
        accelerationMode.appendChild(option);
    });
    const accelerationField = document.createElement('label');
    accelerationField.className = 'space-y-1 text-xs text-gray-400';
    accelerationField.appendChild(document.createTextNode('Acceleration'));
    const accelerationInput = document.createElement('input');
    accelerationInput.type = 'number';
    accelerationInput.step = 'any';
    accelerationInput.min = '0';
    accelerationInput.className = 'acceleration-value w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
    accelerationInput.value = blockState.accelerationValue;
    accelerationInput.setAttribute('aria-label', 'Acceleration value');
    accelerationField.appendChild(accelerationInput);
    const accelerationHint = document.createElement('p');
    accelerationHint.className = 'self-center text-xs leading-5 text-gray-500';
    accelerationHint.className = 'col-span-full text-xs leading-5 text-gray-500';
    accelerationHint.textContent = 'Linear acceleration is converted using screw lead and gear ratio from this block. Current estimates require motor torque constant (N·m/A), DC bus voltage, motor/drive efficiency, and phase durations.';
    const motorParameters = document.createElement('div');
    motorParameters.className = 'motor-current-parameters col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4';
    const motorFields = [
        ['torqueConstantNmPerAmp', 'Motor torque constant (N·m/A)', 0.5],
        ['busVoltage', 'DC bus voltage (V)', 48],
        ['motorDriveEfficiency', 'Motor/drive efficiency (0–1)', 0.9],
        ['accelerationDurationSeconds', 'Acceleration duration (s)', 2],
        ['decelerationDurationSeconds', 'Deceleration duration (s)', 2],
    ];
    motorFields.forEach(([key, labelText, defaultValue]) => {
        const label = document.createElement('label');
        label.className = 'space-y-1 text-xs text-gray-400';
        label.textContent = labelText;
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.min = '0';
        input.className = `motor-current-input motor-current-${key} w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200`;
        input.value = Number.isFinite(blockState[key]) ? blockState[key] : defaultValue;
        input.dataset.parameter = key;
        input.setAttribute('aria-label', labelText);
        label.appendChild(input);
        motorParameters.appendChild(label);
    });
    accelerationControls.append(accelerationMode, accelerationField, accelerationHint, motorParameters);
    const dynamicsGraphs = document.createElement('div');
    dynamicsGraphs.className = 'dynamics-graphs mt-4 space-y-4';
    dynamicsGraphs.hidden = true;
    const torqueMassPanel = document.createElement('div');
    torqueMassPanel.className = 'rounded-lg border border-gray-800 bg-gray-900/60 p-3';
    const torqueMassHeading = document.createElement('h4');
    torqueMassHeading.className = 'text-xs font-semibold text-gray-300';
    torqueMassHeading.textContent = 'Inertia and inertial torque vs. gantry mass (dual axes)';
    const torqueMassCanvas = document.createElement('canvas');
    torqueMassCanvas.className = 'torque-mass-canvas mt-2 block h-64 w-full';
    torqueMassCanvas.setAttribute('role', 'img');
    const torqueInertiaPanel = document.createElement('div');
    torqueInertiaPanel.className = 'rounded-lg border border-gray-800 bg-gray-900/60 p-3';
    const torqueInertiaHeading = document.createElement('h4');
    torqueInertiaHeading.className = 'text-xs font-semibold text-gray-300';
    torqueInertiaHeading.textContent = 'Inertial torque vs. reflected inertia';
    const torqueInertiaCanvas = document.createElement('canvas');
    torqueInertiaCanvas.className = 'torque-inertia-canvas mt-2 block h-64 w-full';
    torqueInertiaCanvas.setAttribute('role', 'img');
    const currentPanel = document.createElement('div');
    currentPanel.className = 'rounded-lg border border-gray-800 bg-gray-900/60 p-3';
    const currentHeading = document.createElement('h4');
    currentHeading.className = 'text-xs font-semibold text-gray-300';
    currentHeading.textContent = 'Estimated motor and DC bus current during acceleration/deceleration';
    const currentCanvas = document.createElement('canvas');
    currentCanvas.className = 'current-time-canvas mt-2 block h-64 w-full';
    currentCanvas.setAttribute('role', 'img');
    currentPanel.append(currentHeading, currentCanvas);
    torqueMassPanel.append(torqueMassHeading, torqueMassCanvas);
    torqueInertiaPanel.append(torqueInertiaHeading, torqueInertiaCanvas);
    dynamicsGraphs.append(torqueMassPanel, torqueInertiaPanel, currentPanel);
    graphWrapper.append(
        graphHeading,
        graphControls,
        graphHint,
        accelerationControls,
        graphStatus,
        graphCanvas,
        dynamicsGraphs,
    );
    const outputRow = document.createElement('div');
    outputRow.className = 'mt-4 pt-3 border-t border-gray-800/40 flex flex-wrap items-center justify-between gap-3 bg-gray-950/40 -mx-5 -mb-5 p-5 rounded-b-xl';
    const outputCaption = document.createElement('span');
    outputCaption.className = 'text-xs text-gray-400 font-medium';
    outputCaption.textContent = 'Computed Result:';
    const outputDisplay = document.createElement('span');
    outputDisplay.className = 'output-display font-mono text-xl font-bold text-emerald-400';
    outputDisplay.textContent = '0.00';
    outputDisplay.setAttribute('aria-live', 'polite');
    const resultUnitSelect = document.createElement('select');
    resultUnitSelect.className = 'result-unit-select bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-xs text-gray-200';
    resultUnitSelect.setAttribute('aria-label', 'Computed result unit');
    const resultArea = document.createElement('div');
    resultArea.className = 'flex flex-wrap items-center justify-end gap-2';
    const resultUnitLabel = document.createElement('label');
    resultUnitLabel.className = 'result-unit-label text-xs text-gray-400';
    resultUnitLabel.textContent = 'Display unit:';
    resultUnitLabel.htmlFor = `${blockId}-result-unit`;
    resultUnitSelect.id = `${blockId}-result-unit`;
    resultArea.append(outputDisplay, resultUnitLabel, resultUnitSelect);
    populateResultUnitSelector(selectedFormula, resultUnitSelect, blockState);
    outputRow.append(outputCaption, resultArea);
    blockNode.append(header, formulaHelp, note, inputGrid, graphWrapper, outputRow);
    canvas.appendChild(blockNode);

    formulaSelect.addEventListener('change', () => {
        blockState.selectedFormula = formulaSelect.value;
        formulaHelp.textContent = formulaDescriptions[blockState.selectedFormula]
            ?? `Calculates ${formulaDisplayNames[blockState.selectedFormula] ?? humanizeName(blockState.selectedFormula)} from the values below.`;
        populateResultUnitSelector(blockState.selectedFormula, resultUnitSelect, blockState);
        const graphProfile = graphProfiles[blockState.selectedFormula];
        if (graphProfile) {
            blockState.graphInput = graphProfile.input;
        }
        renderInputsForBlock(blockNode, blockState);
        const selectedProfile = getGraphProfile(
            blockState.selectedFormula,
            blockState.graphInput,
        );
        if (selectedProfile) {
            blockState.graphMin = selectedProfile.min;
            blockState.graphMax = selectedProfile.max;
            blockState.graphSamples = selectedProfile.samples ?? 51;
            graphMin.value = blockState.graphMin;
            graphMax.value = blockState.graphMax;
            graphSamples.value = blockState.graphSamples;
        }
        evaluatePipeline();
    });
    resultUnitSelect.addEventListener('change', () => {
        blockState.displayUnit = resultUnitSelect.value;
        evaluatePipeline();
    });
    variableInput.addEventListener('input', () => {
        blockState.outputVariable = variableInput.value.replace(/[^a-zA-Z0-9_]/g, '');
        if (variableInput.value !== blockState.outputVariable) {
            variableInput.value = blockState.outputVariable;
        }
        evaluatePipeline();
    });
    graphToggle.addEventListener('change', () => {
        blockState.graphEnabled = graphToggle.checked;
        graphWrapper.hidden = !blockState.graphEnabled;
        evaluatePipeline();
    });
    graphInput.addEventListener('change', () => {
        blockState.graphInput = graphInput.value;
        const graphProfile = getGraphProfile(
            blockState.selectedFormula,
            blockState.graphInput,
        );
        if (graphProfile) {
            blockState.graphMin = graphProfile.min;
            blockState.graphMax = graphProfile.max;
            blockState.graphSamples = graphProfile.samples ?? 51;
            graphMin.value = blockState.graphMin;
            graphMax.value = blockState.graphMax;
            graphSamples.value = blockState.graphSamples;
        }
        evaluatePipeline();
    });
    graphMin.addEventListener('input', () => {
        blockState.graphMin = graphMin.valueAsNumber;
        evaluatePipeline();
    });
    graphMax.addEventListener('input', () => {
        blockState.graphMax = graphMax.valueAsNumber;
        evaluatePipeline();
    });
    graphSamples.addEventListener('input', () => {
        blockState.graphSamples = graphSamples.valueAsNumber;
        evaluatePipeline();
    });
    accelerationMode.addEventListener('change', () => {
        blockState.accelerationMode = accelerationMode.value;
        accelerationField.firstChild.textContent = blockState.accelerationMode === 'linear'
            ? 'Linear acceleration (m/s²)'
            : 'Angular acceleration (rad/s²)';
        evaluatePipeline();
    });
    accelerationInput.addEventListener('input', () => {
        blockState.accelerationValue = accelerationInput.valueAsNumber;
        evaluatePipeline();
    });
    motorParameters.querySelectorAll('.motor-current-input').forEach((input) => {
        input.addEventListener('input', () => {
            blockState[input.dataset.parameter] = input.valueAsNumber;
            evaluatePipeline();
        });
    });
    deleteButton.addEventListener('click', () => {
        activeBlocks = activeBlocks.filter((block) => block.id !== blockId);
        blockNode.remove();
        if (activeBlocks.length === 0) placeholder.classList.remove('hidden');
        evaluatePipeline();
    });

    renderInputsForBlock(blockNode, blockState);
    evaluatePipeline();
}

function populatePipeDropdown(selectElement, currentBlockId) {
    const previousValue = selectElement.value;
    selectElement.replaceChildren();
    const prompt = document.createElement('option');
    prompt.value = '';
    prompt.textContent = 'Select output...';
    selectElement.appendChild(prompt);
    for (const block of activeBlocks) {
        if (block.id === currentBlockId) break;
        if (!block.outputVariable) continue;
        const option = document.createElement('option');
        option.value = block.outputVariable;
        option.textContent = `${block.outputVariable} (${formatFormulaResult(
            block.selectedFormula,
            block.outputValue,
            block.displayUnit,
        )})`;
        option.title = 'This displayed unit is for reference; the calculation uses the original value.';
        selectElement.appendChild(option);
    }
    if ([...selectElement.options].some((option) => option.value === previousValue)) {
        selectElement.value = previousValue;
    }
}

function renderInputsForBlock(blockNode, blockState) {
    const container = blockNode.querySelector('.inputs-grid');
    const graphInput = blockNode.querySelector('.graph-input-select');
    const accelerationControls = blockNode.querySelector('.acceleration-controls');
    accelerationControls.hidden = blockState.selectedFormula !== 'reflectedLinearLoadInertia';
    const oldInputs = blockState.inputs;
    blockState.inputs = {};
    container.replaceChildren();

    const parameters = formulaArguments.get(blockState.selectedFormula);
    graphInput.replaceChildren();
    parameters.forEach(({ name }) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = `Sweep ${name}`;
        graphInput.appendChild(option);
    });
    if (!parameters.some(({ name }) => name === blockState.graphInput)) {
        blockState.graphInput =
            graphProfiles[blockState.selectedFormula]?.input ??
            parameters[0]?.name ??
            '';
    }
    graphInput.value = blockState.graphInput;

    parameters.forEach(({ name, defaultValue }) => {
        const savedInput = oldInputs[name] && typeof oldInputs[name] === 'object'
            ? oldInputs[name]
            : { type: 'literal', value: defaultValue };
        const inputState = {
            type: savedInput.type === 'pipe' ? 'pipe' : 'literal',
            value: savedInput.value ?? defaultValue,
        };
        const inputOptions = formulaInputOptions[
            `${blockState.selectedFormula}.${name}`
        ];
        blockState.inputs[name] = inputState;

        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-1.5';
        const label = document.createElement('label');
        label.className = 'block text-xs font-medium text-gray-400';
        const inputName = formulaInputDisplayNames[name] ?? humanizeName(name);
        const labelText = optionalFormulaParameters.has(
            `${blockState.selectedFormula}.${name}`,
        )
            ? blockState.selectedFormula === 'estimateDcSupplyCurrent'
                ? `${inputName} (optional; or enter load voltage and current)`
                : `${inputName} (optional; choose one)`
            : inputName;
        label.textContent = labelText;
        label.dataset.arg = name;
        const description = formulaInputDescriptions[blockState.selectedFormula]?.[name];
        if (description) {
            label.title = description;
            label.setAttribute('aria-label', `${labelText}. ${description}`);
            const help = document.createElement('span');
            help.className = 'ml-1 inline-flex cursor-help text-blue-400';
            help.textContent = 'ⓘ';
            help.title = description;
            help.tabIndex = 0;
            help.setAttribute('role', 'img');
            help.setAttribute('aria-label', `Help: ${description}`);
            label.appendChild(help);
        }
        const controls = document.createElement('div');
        controls.className = 'flex gap-2';
        const sourceSelect = document.createElement('select');
        sourceSelect.className = 'input-source-toggle bg-gray-950 border border-gray-800 rounded-lg text-xs px-2 py-2 text-gray-300';
        [['literal', 'Value'], ['pipe', 'Pipe 🔗']].forEach(([value, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            option.selected = inputState.type === value;
            sourceSelect.appendChild(option);
        });
        const literalInput = inputOptions
            ? document.createElement('select')
            : document.createElement('input');
        if (!inputOptions) {
            literalInput.type = 'number';
            literalInput.step = 'any';
        } else {
            inputOptions.forEach(({ value, label: optionLabel }) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = optionLabel;
                literalInput.appendChild(option);
            });
        }
        literalInput.className = 'literal-input min-w-0 flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
        literalInput.value = inputState.type === 'literal' && inputState.value !== null
            ? inputState.value
            : inputState.type === 'literal' && optionalFormulaParameters.has(
                `${blockState.selectedFormula}.${name}`,
            )
                ? ''
                : defaultValue;
        literalInput.setAttribute('aria-label', labelText);
        const pipeSelect = document.createElement('select');
        pipeSelect.className = 'pipe-input min-w-0 flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200';
        pipeSelect.classList.toggle('hidden', inputState.type !== 'pipe');
        sourceSelect.hidden = Boolean(inputOptions);
        pipeSelect.hidden = Boolean(inputOptions) || inputState.type !== 'pipe';
        literalInput.classList.toggle('hidden', inputState.type !== 'literal');
        populatePipeDropdown(pipeSelect, blockState.id);
        if (inputState.type === 'pipe') pipeSelect.value = inputState.value;
        controls.append(sourceSelect, literalInput, pipeSelect);
        wrapper.append(label, controls);
        if (description) {
            const helpText = document.createElement('p');
            helpText.className = 'text-[11px] leading-4 text-gray-500';
            helpText.textContent = description;
            wrapper.appendChild(helpText);
        }
        container.appendChild(wrapper);

        sourceSelect.addEventListener('change', () => {
            inputState.type = sourceSelect.value;
            literalInput.classList.toggle('hidden', inputState.type !== 'literal');
            pipeSelect.classList.toggle('hidden', inputState.type !== 'pipe');
            if (inputState.type === 'pipe') populatePipeDropdown(pipeSelect, blockState.id);
            inputState.value = inputState.type === 'literal'
                ? inputOptions
                    ? literalInput.value
                    : optionalFormulaParameters.has(`${blockState.selectedFormula}.${name}`) &&
                    literalInput.value === ''
                    ? null
                    : literalInput.valueAsNumber
                : pipeSelect.value;
            evaluatePipeline();
        });
        literalInput.addEventListener('input', () => {
            inputState.value = optionalFormulaParameters.has(
                `${blockState.selectedFormula}.${name}`,
            ) && literalInput.value === ''
                ? null
                : inputOptions
                    ? literalInput.value
                    : literalInput.valueAsNumber;
            evaluatePipeline();
        });
        pipeSelect.addEventListener('change', () => {
            inputState.value = pipeSelect.value;
            evaluatePipeline();
        });
    });
}

function getInputValue(block, name, scope) {
    const input = block.inputs[name];
    if (!input) throw new Error(`Missing input "${name}".`);
    if (input.type === 'literal') {
        if (
            input.value === null &&
            optionalFormulaParameters.has(`${block.selectedFormula}.${name}`)
        ) {
            return null;
        }
        const inputOptions = formulaInputOptions[
            `${block.selectedFormula}.${name}`
        ];
        if (inputOptions) {
            if (!inputOptions.some(({ value }) => value === input.value)) {
                throw new Error(`Choose a valid option for "${name}".`);
            }
            return input.value;
        }
        if (!Number.isFinite(input.value)) throw new Error(`Enter a valid number for "${name}".`);
        return input.value;
    }
    if (!input.value || !Object.hasOwn(scope, input.value)) {
        throw new Error(`Select an available output for "${name}".`);
    }
    return scope[input.value];
}

function invokeFormula(formulaName, parameters, values) {
    const parameterConfig = formulaParameterRegistry[formulaName];
    const inputValues = Object.fromEntries(
        parameters.map(({ name }, index) => [name, values[index]]),
    );
    if (parameterConfig?.type === 'destructured_object') {
        const options = {};
        parameters.slice(2).forEach(({ name }, index) => {
            const value = values[index + 2];
            if (value !== null) options[name] = value;
        });
        return CncHardwareMath[formulaName](
            inputValues.supplyVoltage,
            inputValues.phaseCurrentAmps,
            options,
        );
    }
    if (parameterConfig?.type === 'array_of_objects') {
        const load = { quantity: inputValues.loadQuantity };
        if (inputValues.loadPowerWatts !== null) {
            load.powerWatts = inputValues.loadPowerWatts;
        } else {
            load.voltage = inputValues.loadVoltage;
            load.currentAmps = inputValues.loadCurrentAmps;
        }
        return CncHardwareMath[formulaName](
            inputValues.supplyVoltage,
            [load],
            inputValues.efficiency,
        );
    }
    return CncHardwareMath[formulaName](...values);
}

function evaluatePipeline() {
    const scope = {};
    activeBlocks.forEach((block) => {
        const blockNode = document.getElementById(block.id);
        if (!blockNode) return;
        blockNode.querySelectorAll('.pipe-input').forEach((select) => populatePipeDropdown(select, block.id));
        const display = blockNode.querySelector('.output-display');
        try {
            const parameters = formulaArguments.get(block.selectedFormula);
            const args = parameters.map(({ name }) => getInputValue(block, name, scope));
            const result = invokeFormula(block.selectedFormula, parameters, args);
            const scalarResult = typeof result === 'number'
                ? result
                : result && typeof result === 'object'
                    ? result.voltageDrop ?? result.supplyCurrentAmps ?? result.estimatedSupplyCurrentAmps
                    : result;
            if (typeof scalarResult !== 'number' || Number.isNaN(scalarResult)) {
                throw new Error('The formula did not produce a numeric result.');
            }
            block.outputValue = scalarResult;
            block.error = null;
            display.textContent = formatFormulaResult(
                block.selectedFormula,
                scalarResult,
                block.displayUnit,
            );
            display.title = '';
            display.classList.remove('text-red-400');
            display.classList.add('text-emerald-400');
            if (block.outputVariable) scope[block.outputVariable] = scalarResult;
        } catch (error) {
            block.outputValue = NaN;
            block.error = error.message;
            display.textContent = 'Error';
            display.title = error.message;
            display.classList.remove('text-emerald-400');
            display.classList.add('text-red-400');
        }
        if (block.graphEnabled) renderBlockGraph(block, blockNode, scope);
    });
    runCrossBlockSafetyChecks(scope);
    renderSidebarLedger(scope);
    renderPipelineGraphGallery();
}

function renderBlockGraph(block, blockNode, scope) {
    const canvas = blockNode.querySelector('.graph-canvas');
    const status = blockNode.querySelector('.graph-status');
    const parameters = formulaArguments.get(block.selectedFormula);
    const dynamicsGraphs = blockNode.querySelector('.dynamics-graphs');
    const isReflectedInertia = block.selectedFormula === 'reflectedLinearLoadInertia';
    dynamicsGraphs.hidden = !isReflectedInertia;
    canvas.hidden = isReflectedInertia;
    const inputIndex = parameters.findIndex(({ name }) => name === block.graphInput);
    const sampleCount = block.graphSamples;
    if (
        inputIndex < 0 ||
        !Number.isFinite(block.graphMin) ||
        !Number.isFinite(block.graphMax) ||
        block.graphMin >= block.graphMax ||
        !Number.isInteger(sampleCount) ||
        sampleCount < 2 ||
        sampleCount > 500
    ) {
        clearGraph(canvas);
        status.textContent = 'Choose a valid sweep range and a sample count from 2 to 500.';
        return;
    }

    if (isReflectedInertia) {
        renderInertiaTorqueGraphs(block, blockNode, status, scope);
        return;
    }

    let baseArguments;
    try {
        baseArguments = parameters.map(({ name }) => getInputValue(block, name, scope));
    } catch (error) {
        clearGraph(canvas);
        status.textContent = `Cannot graph until inputs are valid: ${error.message}`;
        return;
    }

    const points = [];
    let failedSamples = 0;
    for (let index = 0; index < sampleCount; index += 1) {
        const sweptValue =
            block.graphMin + ((block.graphMax - block.graphMin) * index) / (sampleCount - 1);
        const args = [...baseArguments];
        args[inputIndex] = sweptValue;
        try {
            const result = invokeFormula(block.selectedFormula, parameters, args);
            const value = typeof result === 'number'
                ? result
                : result && typeof result === 'object'
                    ? result.voltageDrop ?? result.supplyCurrentAmps ?? result.estimatedSupplyCurrentAmps
                    : NaN;
            if (typeof value === 'number' && Number.isFinite(value)) {
                points.push({ x: sweptValue, y: value });
            } else {
                failedSamples += 1;
            }
        } catch {
            failedSamples += 1;
        }
    }

    if (points.length === 0) {
        clearGraph(canvas);
        status.textContent = 'No finite results in this sweep. Adjust the range or inputs.';
        return;
    }
    try {
        const graphProfile = getGraphProfile(block.selectedFormula, block.graphInput);
        drawSweepGraph(
            canvas,
            points,
            graphProfile?.xLabel ?? `${block.graphInput} (sweep input)`,
            graphProfile?.yLabel ?? `${block.selectedFormula} output`,
        );
    } catch (error) {
        clearGraph(canvas);
        status.textContent = `Unable to draw graph: ${error.message}`;
        return;
    }
    status.textContent = failedSamples > 0
        ? `${points.length} valid points; ${failedSamples} invalid samples omitted.`
        : `${points.length} samples plotted.`;
}

function renderInertiaTorqueGraphs(block, blockNode, status, scope) {
    const parameters = formulaArguments.get(block.selectedFormula);
    const massIndex = parameters.findIndex(({ name }) => name === 'totalMovingMassKg');
    let baseArguments;
    try {
        baseArguments = parameters.map(({ name }) => getInputValue(block, name, scope));
    } catch (error) {
        clearGraph(blockNode.querySelector('.torque-mass-canvas'));
        clearGraph(blockNode.querySelector('.torque-inertia-canvas'));
        status.textContent = `Cannot graph dynamics until inputs are valid: ${error.message}`;
        return;
    }

    const screwLeadMeter = baseArguments[parameters.findIndex(({ name }) => name === 'screwLeadMeter')];
    const gearRatio = baseArguments[parameters.findIndex(({ name }) => name === 'gearRatio')];
    if (
        massIndex < 0 ||
        !Number.isFinite(screwLeadMeter) ||
        screwLeadMeter <= 0 ||
        !Number.isFinite(gearRatio) ||
        gearRatio <= 0 ||
        !Number.isFinite(block.accelerationValue) ||
        block.accelerationValue < 0
    ) {
        clearGraph(blockNode.querySelector('.torque-mass-canvas'));
        clearGraph(blockNode.querySelector('.torque-inertia-canvas'));
        status.textContent = 'Enter a positive screw lead and gear ratio, plus a non-negative acceleration.';
        return;
    }

    const angularAcceleration = block.accelerationMode === 'linear'
        ? (block.accelerationValue * 2 * Math.PI * gearRatio) / screwLeadMeter
        : block.accelerationValue;
    const linearAcceleration = block.accelerationMode === 'angular'
        ? (angularAcceleration * screwLeadMeter) / (2 * Math.PI * gearRatio)
        : block.accelerationValue;
    const inertiaPoints = [];
    let failedSamples = 0;

    for (let index = 0; index < block.graphSamples; index += 1) {
        const mass =
            block.graphMin +
            ((block.graphMax - block.graphMin) * index) / (block.graphSamples - 1);
        const args = [...baseArguments];
        args[massIndex] = mass;
        try {
            const inertia = CncHardwareMath.reflectedLinearLoadInertia(...args);
            if (!Number.isFinite(inertia) || inertia < 0) {
                failedSamples += 1;
                continue;
            }
            inertiaPoints.push({
                mass,
                inertia,
                torque: inertia * angularAcceleration,
            });
        } catch {
            failedSamples += 1;
        }
    }

    if (inertiaPoints.length === 0) {
        clearGraph(blockNode.querySelector('.torque-mass-canvas'));
        clearGraph(blockNode.querySelector('.torque-inertia-canvas'));
        status.textContent = 'No valid inertia samples in this mass sweep.';
        return;
    }

    const torqueMassCanvas = blockNode.querySelector('.torque-mass-canvas');
    const torqueInertiaCanvas = blockNode.querySelector('.torque-inertia-canvas');
    drawDualAxisGraph(
        torqueMassCanvas,
        inertiaPoints.map(({ mass, inertia }) => ({ x: mass, y: inertia })),
        inertiaPoints.map(({ mass, torque }) => ({ x: mass, y: torque })),
        'Gantry mass (kg)',
        'Reflected inertia (kg·m²)',
        'Inertial torque (N·m)',
    );
    drawSweepGraph(
        torqueInertiaCanvas,
        inertiaPoints.map(({ inertia, torque }) => ({ x: inertia, y: torque })),
        'Reflected inertia (kg·m²)',
        'Inertial torque (N·m)',
    );
    const currentStatus = renderCurrentTimeGraph(
        block,
        blockNode.querySelector('.current-time-canvas'),
        baseArguments,
        angularAcceleration,
    );
    torqueMassCanvas.setAttribute(
        'aria-label',
        `Reflected inertia and inertial torque versus gantry mass. Linear acceleration ${formatEngineeringValue(linearAcceleration)} meters per second squared; angular acceleration ${formatEngineeringValue(angularAcceleration)} radians per second squared.`,
    );
    torqueInertiaCanvas.setAttribute(
        'aria-label',
        `Inertial torque versus reflected inertia at ${formatEngineeringValue(angularAcceleration)} radians per second squared angular acceleration.`,
    );
    status.textContent = `${inertiaPoints.length} mass samples plotted. Derived acceleration: ${formatEngineeringValue(linearAcceleration)} m/s² and ${formatEngineeringValue(angularAcceleration)} rad/s². ${currentStatus}${failedSamples ? ` ${failedSamples} invalid samples omitted.` : ''}`;
}

function renderCurrentTimeGraph(block, graphCanvas, formulaArgumentsForBlock, angularAcceleration) {
    const {
        torqueConstantNmPerAmp,
        busVoltage,
        motorDriveEfficiency,
        accelerationDurationSeconds,
        decelerationDurationSeconds,
    } = block;
    const parameters = formulaArguments.get(block.selectedFormula);
    const massIndex = parameters
        .findIndex(({ name }) => name === 'totalMovingMassKg');
    const movingMassKg = formulaArgumentsForBlock[massIndex];
    if (
        !Number.isFinite(movingMassKg) ||
        movingMassKg < 0 ||
        !Number.isFinite(torqueConstantNmPerAmp) ||
        torqueConstantNmPerAmp <= 0 ||
        !Number.isFinite(busVoltage) ||
        busVoltage <= 0 ||
        !Number.isFinite(motorDriveEfficiency) ||
        motorDriveEfficiency <= 0 ||
        motorDriveEfficiency > 1 ||
        !Number.isFinite(accelerationDurationSeconds) ||
        accelerationDurationSeconds <= 0 ||
        !Number.isFinite(decelerationDurationSeconds) ||
        decelerationDurationSeconds <= 0
    ) {
        clearGraph(graphCanvas);
        return 'Enter positive torque constant, bus voltage, efficiency, and acceleration/deceleration durations to graph current.';
    }

    const leadIndex = parameters
        .findIndex(({ name }) => name === 'screwLeadMeter');
    const ratioIndex = parameters
        .findIndex(({ name }) => name === 'gearRatio');
    const screwLead = formulaArgumentsForBlock[leadIndex];
    const gearRatio = formulaArgumentsForBlock[ratioIndex];
    if (
        massIndex < 0 ||
        !Number.isFinite(screwLead) ||
        screwLead <= 0 ||
        !Number.isFinite(gearRatio) ||
        gearRatio <= 0
    ) {
        clearGraph(graphCanvas);
        return 'Current graph requires literal screw lead and gear ratio inputs.';
    }

    const reflectedInertia =
        CncHardwareMath.reflectedLinearLoadInertia(movingMassKg, screwLead, gearRatio);
    const accelerationTorque = reflectedInertia * angularAcceleration;
    const peakMotorCurrent = accelerationTorque / torqueConstantNmPerAmp;
    const peakAngularVelocity = angularAcceleration * accelerationDurationSeconds;
    const duration = accelerationDurationSeconds + decelerationDurationSeconds;
    const sampleCount = 101;
    const points = [];
    for (let index = 0; index < sampleCount; index += 1) {
        const time = (duration * index) / (sampleCount - 1);
        let torque;
        let angularVelocity;
        if (time <= accelerationDurationSeconds) {
            torque = accelerationTorque;
            angularVelocity = angularAcceleration * time;
        } else {
            const decelerationProgress =
                (time - accelerationDurationSeconds) / decelerationDurationSeconds;
            const decelerationAngularAcceleration =
                peakAngularVelocity / decelerationDurationSeconds;
            torque = -reflectedInertia * decelerationAngularAcceleration;
            angularVelocity = peakAngularVelocity * (1 - decelerationProgress);
        }
        points.push({
            x: time,
            motorCurrent: torque / torqueConstantNmPerAmp,
            dcBusCurrent:
                (torque * angularVelocity) /
                (busVoltage * motorDriveEfficiency),
        });
    }
    drawDualAxisGraph(
        graphCanvas,
        points.map(({ x, motorCurrent }) => ({ x, y: motorCurrent })),
        points.map(({ x, dcBusCurrent }) => ({ x, y: dcBusCurrent })),
        'Time (s)',
        'Torque-producing motor current (A)',
        'Estimated DC bus current (A)',
    );
    graphCanvas.setAttribute(
        'aria-label',
        'Estimated torque-producing motor current and DC bus current over a simplified acceleration and deceleration cycle. Negative DC bus current represents idealized regenerative power.',
    );
    return `Peak torque-producing current ${formatEngineeringValue(peakMotorCurrent)} A; deceleration current is signed negative. DC bus current is an ideal mechanical-power estimate and may be negative during regeneration.`;
}

function drawDualAxisGraph(
    canvas,
    firstSeries,
    secondSeries,
    xAxisLabel,
    leftAxisLabel,
    rightAxisLabel,
) {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(bounds.width));
    const height = Math.max(220, Math.round(bounds.height));
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable.');
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const margin = { top: 24, right: 82, bottom: 48, left: 82 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const xMin = Math.min(...firstSeries.map(({ x }) => x));
    const xMax = Math.max(...firstSeries.map(({ x }) => x));
    const yMinFor = (series) => Math.min(0, ...series.map(({ y }) => y));
    const yMaxFor = (series) => Math.max(...series.map(({ y }) => y));
    let leftMin = yMinFor(firstSeries);
    let leftMax = yMaxFor(firstSeries);
    let rightMin = yMinFor(secondSeries);
    let rightMax = yMaxFor(secondSeries);
    if (leftMin === leftMax) leftMax = leftMin + 1;
    if (rightMin === rightMax) rightMax = rightMin + 1;
    leftMax += (leftMax - leftMin) * 0.08;
    rightMax += (rightMax - rightMin) * 0.08;

    context.font = '10px sans-serif';
    context.lineWidth = 1;
    context.strokeStyle = '#374151';
    context.fillStyle = '#9ca3af';
    for (let tick = 0; tick <= 4; tick += 1) {
        const fraction = tick / 4;
        const y = margin.top + plotHeight * fraction;
        context.beginPath();
        context.moveTo(margin.left, y);
        context.lineTo(width - margin.right, y);
        context.stroke();
        context.textBaseline = 'middle';
        context.textAlign = 'right';
        context.fillText(
            formatEngineeringValue(leftMax - (leftMax - leftMin) * fraction),
            margin.left - 6,
            y,
        );
        context.textAlign = 'left';
        context.fillText(
            formatEngineeringValue(rightMax - (rightMax - rightMin) * fraction),
            width - margin.right + 6,
            y,
        );
    }

    const drawSeries = (series, yMin, yMax, color) => {
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.beginPath();
        series.forEach(({ x, y }, index) => {
            const px = margin.left + ((x - xMin) / (xMax - xMin || 1)) * plotWidth;
            const py = margin.top + ((yMax - y) / (yMax - yMin)) * plotHeight;
            if (index === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
        });
        context.stroke();
    };
    drawSeries(firstSeries, leftMin, leftMax, '#60a5fa');
    drawSeries(secondSeries, rightMin, rightMax, '#f59e0b');

    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = '#60a5fa';
    context.fillText(leftAxisLabel, margin.left + 70, 4);
    context.fillStyle = '#f59e0b';
    context.fillText(rightAxisLabel, width - margin.right - 70, 4);
    context.fillStyle = '#9ca3af';
    context.fillText(xAxisLabel, margin.left + plotWidth / 2, height - 28);
}

function renderPipelineGraphGallery() {
    pipelineGraphsContainer.replaceChildren();
    const graphBlocks = activeBlocks
        .filter((block) => block.graphEnabled)
        .map((block) => ({
            block,
            node: document.getElementById(block.id),
        }))
        .filter(({ node }) => node);
    pipelineGraphs.hidden = graphBlocks.length === 0;
    graphBlocks.forEach(({ block, node }) => {
        const section = document.createElement('section');
        section.className = 'rounded-lg border border-gray-800 bg-gray-950 p-4';
        const heading = document.createElement('h3');
        heading.className = 'mb-3 text-sm font-semibold text-blue-300';
        heading.textContent = `Block ${activeBlocks.indexOf(block) + 1}: ${block.selectedFormula}`;
        section.appendChild(heading);
        const sourceCanvases = [...node.querySelectorAll(
            '.graph-canvas:not([hidden]), .dynamics-graphs:not([hidden]) canvas:not([hidden])',
        )]
            .filter((source) => !source.hidden && source.width > 0 && source.height > 0);
        sourceCanvases.forEach((source) => {
            const figure = document.createElement('figure');
            figure.className = 'mb-4 last:mb-0';
            const caption = document.createElement('figcaption');
            caption.className = 'mb-1 text-xs text-gray-400';
            caption.textContent = source.getAttribute('aria-label') || 'Formula graph';
            const copy = document.createElement('canvas');
            copy.className = 'block h-64 w-full';
            copy.setAttribute('role', 'img');
            copy.setAttribute('aria-label', caption.textContent);
            const bounds = copy.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            copy.width = Math.max(320, Math.round(bounds.width || source.width / pixelRatio)) * pixelRatio;
            copy.height = Math.max(220, Math.round(bounds.height || source.height / pixelRatio)) * pixelRatio;
            const context = copy.getContext('2d');
            if (!context) return;
            context.drawImage(source, 0, 0, copy.width, copy.height);
            figure.append(caption, copy);
            section.appendChild(figure);
        });
        pipelineGraphsContainer.appendChild(section);
    });
}

function clearGraph(canvas) {
    const context = canvas.getContext('2d');
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    canvas.width = width;
    canvas.height = height;
    context?.clearRect(0, 0, width, height);
}

function drawSweepGraph(canvas, points, xAxisLabel, yAxisLabel) {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(bounds.width));
    const height = Math.max(220, Math.round(bounds.height));
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable.');
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const margin = { top: 14, right: 18, bottom: 42, left: 72 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const xMin = points[0].x;
    const xMax = points[points.length - 1].x;
    let yMin = Math.min(...points.map(({ y }) => y));
    let yMax = Math.max(...points.map(({ y }) => y));
    if (yMin === yMax) {
        const padding = Math.max(Math.abs(yMin) * 0.05, 1);
        yMin -= padding;
        yMax += padding;
    } else {
        const padding = (yMax - yMin) * 0.08;
        yMin -= padding;
        yMax += padding;
    }

    context.font = '11px sans-serif';
    context.lineWidth = 1;
    context.strokeStyle = '#374151';
    context.fillStyle = '#9ca3af';
    for (let tick = 0; tick <= 4; tick += 1) {
        const fraction = tick / 4;
        const y = margin.top + plotHeight * fraction;
        const value = yMax - (yMax - yMin) * fraction;
        context.beginPath();
        context.moveTo(margin.left, y);
        context.lineTo(width - margin.right, y);
        context.stroke();
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        context.fillText(formatEngineeringValue(value), margin.left - 8, y);
    }
    context.strokeStyle = '#34d399';
    context.lineWidth = 2;
    context.beginPath();
    points.forEach(({ x, y }, index) => {
        const plotX = margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
        const plotY = margin.top + ((yMax - y) / (yMax - yMin)) * plotHeight;
        if (index === 0) context.moveTo(plotX, plotY);
        else context.lineTo(plotX, plotY);
    });
    context.stroke();

    context.fillStyle = '#9ca3af';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(xAxisLabel, margin.left + plotWidth / 2, height - 30);
    context.save();
    context.translate(16, margin.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(yAxisLabel, 0, 0);
    context.restore();
    canvas.setAttribute(
        'aria-label',
        `Graph of ${yAxisLabel} against ${xAxisLabel}, from ${formatEngineeringValue(xMin)} to ${formatEngineeringValue(xMax)}.`,
    );
}

window.addEventListener('resize', () => {
    if (activeBlocks.some((block) => block.graphEnabled)) evaluatePipeline();
});

function runCrossBlockSafetyChecks(scope) {
    document.querySelectorAll('.safety-warning-badge').forEach((element) => element.remove());
    document.querySelectorAll('.border-amber-500').forEach((element) => {
        element.classList.remove('border-amber-500', 'bg-amber-950/10');
    });
    document.querySelectorAll('.border-red-500').forEach((element) => {
        element.classList.remove('border-red-500', 'bg-red-950/10');
    });
    const voltageDropThreshold = voltageDropThresholdInput.valueAsNumber;
    const validVoltageDropThreshold =
        Number.isFinite(voltageDropThreshold) &&
        voltageDropThreshold >= 0.1 &&
        voltageDropThreshold <= 15;
    voltageDropThresholdStatus.hidden = validVoltageDropThreshold;
    voltageDropThresholdStatus.textContent = validVoltageDropThreshold
        ? ''
        : 'Voltage-drop diagnostics need a threshold from 0.1% to 15%.';
    voltageDropThresholdInput.setAttribute(
        'aria-invalid',
        String(!validVoltageDropThreshold),
    );
    activeBlocks.forEach((block) => {
        if (!Number.isFinite(block.outputValue)) return;
        if (
            validVoltageDropThreshold &&
            block.selectedFormula === 'dcWireVoltageDrop'
        ) {
            const supplyVoltage = scopeValue(block, 'supplyVoltage', scope);
            if (Number.isFinite(supplyVoltage) && supplyVoltage > 0) {
                const dropPercent = (block.outputValue / supplyVoltage) * 100;
                if (dropPercent > voltageDropThreshold) {
                    injectWarning(
                        block.id,
                        'oneWayLengthMeters',
                        `Critical design warning: ${dropPercent.toFixed(2)}% voltage drop exceeds your ${voltageDropThreshold}% threshold. Review conductor size, run length, and load current. This is a diagnostic, not an automatic interlock or code-compliance check.`,
                        'red',
                    );
                } else if (dropPercent > 3) {
                    injectWarning(
                        block.id,
                        'oneWayLengthMeters',
                        `Design review advised: ${dropPercent.toFixed(2)}% voltage drop exceeds the common 3% planning guideline. Requirements vary by application and jurisdiction.`,
                    );
                }
            }
        }
        if (block.selectedFormula === 'stepperMaxTargetVoltage' && block.outputValue > 0) {
            activeBlocks.forEach((otherBlock) => {
                if (!Object.hasOwn(otherBlock.inputs, 'supplyVoltage')) return;
                try {
                    const plannedVoltage = getInputValue(otherBlock, 'supplyVoltage', scope);
                    if (plannedVoltage > block.outputValue) {
                        injectWarning(
                            otherBlock.id,
                            'supplyVoltage',
                            `⚠️ High Risk: Voltage (${plannedVoltage} V) exceeds the estimated motor threshold (${block.outputValue.toFixed(1)} V). Verify the motor and driver specifications.`,
                        );
                    }
                } catch {
                    // The regular input error state already explains an unresolved value.
                }
            });
        }
        if (block.selectedFormula === 'maxFeedRateByFrequency') {
            const hz = scopeValue(block, 'controllerHz', scope);
            const resolution = scopeValue(block, 'stepsOrCountsPerMm', scope);
            if (resolution > 500 && hz <= 30000) {
                injectWarning(
                    block.id,
                    'controllerHz',
                    '⚠️ Processor bottleneck: a 30 kHz controller may limit feed rate above 500 steps/mm.',
                );
            }
        }
        if (block.selectedFormula === 'getInertiaRatio' && block.outputValue > 10) {
            injectWarning(
                block.id,
                'motorInertia',
                `⚠️ High inertia ratio (${block.outputValue.toFixed(1)}:1). Check the servo manufacturer’s tuning guidance.`,
            );
        }
        if (block.selectedFormula === 'getMechanicalResolution' && block.outputValue > 0.05) {
            injectWarning(
                block.id,
                'stepsOrCountsPerMm',
                `ℹ️ Coarse resolution: ${block.outputValue.toFixed(3)} mm/step or count may be unsuitable for fine machining.`,
            );
        }
        // CHECK 5: Low power factor warning
        if (
            (block.selectedFormula === 'threePhaseAcPowerFactor' ||
                block.selectedFormula === 'singlePhaseAcPowerFactor') &&
            block.outputValue < 0.75 &&
            block.outputValue > 0
        ) {
            injectWarning(
                block.id,
                'realPowerWatts',
                `High Reactive Load: Your power factor (${block.outputValue.toFixed(2)}) is causing heavy efficiency loss. This creates immense wasted heat in the lines. Consider adding power factor correction capacitors!`,
            );
        }
        // CHECK 6: Near-zero series impedance warning
        if (
            block.selectedFormula === 'seriesRlcImpedanceOhms' &&
            block.outputValue < 0.1 &&
            block.outputValue > 0
        ) {
            injectWarning(
                block.id,
                'resistanceOhms',
                `Short Circuit Danger: Calculated series RLC impedance is extremely low (${block.outputValue.toFixed(3)} Ω). At resonance, current spikes destructively. Verify your dampening resistance or inductance parameters!`,
            );
        }
    });
}

function scopeValue(block, name, scope) {
    try {
        return getInputValue(block, name, scope);
    } catch {
        return NaN;
    }
}

function injectWarning(blockId, inputFieldName, message, severity = 'amber') {
    const blockNode = document.getElementById(blockId);
    const label = blockNode?.querySelector(`[data-arg="${inputFieldName}"]`);
    if (!blockNode || !label) return;
    const isCritical = severity === 'red';
    blockNode.classList.add(
        isCritical ? 'border-red-500' : 'border-amber-500',
        isCritical ? 'bg-red-950/10' : 'bg-amber-950/10',
    );
    const warning = document.createElement('div');
    warning.className = isCritical
        ? 'safety-warning-badge text-[11px] font-sans text-red-300 mt-1 bg-red-950/40 border border-red-800/50 p-2 rounded-md leading-relaxed'
        : 'safety-warning-badge text-[11px] font-sans text-amber-400 mt-1 bg-amber-950/40 border border-amber-800/50 p-2 rounded-md leading-relaxed';
    warning.setAttribute('role', 'alert');
    warning.textContent = message;
    label.parentNode.appendChild(warning);
}

function formatEngineeringValue(value) {
    if (value === Infinity) return '∞';
    if (value === -Infinity) return '−∞';
    if (value === 0) return '0.00';
    if (Math.abs(value) < 0.0001) return value.toExponential(4);
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });
}

function humanizeName(name) {
    const acronyms = {
        Ac: 'AC',
        Dc: 'DC',
        Awg: 'AWG',
        Hp: 'HP',
        Hz: 'Hz',
        Lc: 'LC',
        Mm: 'mm',
        Nm: 'N·m',
        N: 'N',
        Ppr: 'PPR',
        Psu: 'PSU',
        Rpm: 'RPM',
        Rlc: 'RLC',
        Rms: 'RMS',
        Usb: 'USB',
        V: 'V',
    };
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[_\s]+/)
        .map((word) => {
            const normalized = `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`;
            return acronyms[normalized] ?? normalized;
        })
        .join(' ');
}

function populateResultUnitSelector(formulaName, select, blockState) {
    const resultUnit = formulaResultUnits[formulaName];
    const conversion = resultUnit?.dimension
        ? resultUnitOptions[resultUnit.dimension]
        : null;
    select.replaceChildren();

    if (!conversion || conversion.units.length < 2) {
        select.hidden = true;
        select.parentElement.querySelector('.result-unit-label').hidden = true;
        blockState.displayUnit = '';
        return;
    }

    conversion.units.forEach(({label}) => {
        const option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        select.appendChild(option);
    });

    const selectedUnit = conversion.units.some(({label}) => label === blockState.displayUnit)
        ? blockState.displayUnit
        : conversion.default;
    blockState.displayUnit = selectedUnit;
    select.value = selectedUnit;
    select.hidden = false;
    select.parentElement.querySelector('.result-unit-label').hidden = false;
}

function formatFormulaResult(formulaName, value, displayUnit) {
    const resultUnit = formulaResultUnits[formulaName];
    if (!resultUnit) return formatEngineeringValue(value);

    const conversion = resultUnit.dimension
        ? resultUnitOptions[resultUnit.dimension]
        : null;
    if (conversion) {
        const selectedUnit = conversion.units.find(({label}) => label === displayUnit)
            ?? conversion.units.find(({label}) => label === conversion.default);
        const convertedValue =
            (value * (resultUnit.nativeFactor ?? 1)) / selectedUnit.toBase;
        return `${formatEngineeringValue(convertedValue)} ${selectedUnit.label}`;
    }

    return resultUnit.unit
        ? `${formatEngineeringValue(value)} ${resultUnit.unit}`
        : formatEngineeringValue(value);
}

function renderSidebarLedger(scope) {
    varContainer.replaceChildren();
    if (activeBlocks.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'text-xs text-gray-500 italic p-3 text-center bg-gray-950 rounded-lg border border-dashed border-gray-800';
        emptyMessage.textContent = 'No pipeline outputs computed yet. Add a calculation block to begin chain.';
        varContainer.appendChild(emptyMessage);
        return;
    }
    Object.entries(scope).forEach(([variableName, value]) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2.5 bg-gray-950 rounded-lg border border-gray-800/80 hover:border-gray-700 transition-colors font-mono text-xs';
        const name = document.createElement('span');
        name.className = 'text-blue-400 font-bold';
        name.textContent = `🔗 ${variableName}`;
        const result = document.createElement('span');
        result.className = 'text-emerald-400 font-bold';
        const sourceBlock = activeBlocks.find((block) => block.outputVariable === variableName);
        result.textContent = sourceBlock
            ? formatFormulaResult(
                sourceBlock.selectedFormula,
                value,
                sourceBlock.displayUnit,
            )
            : formatEngineeringValue(value);
        item.append(name, result);
        varContainer.appendChild(item);
    });
}

function exportTimelineConfiguration() {
    if (activeBlocks.length === 0) {
        alert('The pipeline contains no elements to save.');
        return;
    }
    const data = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(activeBlocks, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = data;
    downloadAnchor.download = 'cnc_studio_pipeline.json';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importTimelineConfiguration(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsedConfig = JSON.parse(reader.result);
            if (
                !Array.isArray(parsedConfig) ||
                !parsedConfig.every((block) => block && typeof block === 'object')
            ) {
                throw new Error('The selected file must contain an array of formula blocks.');
            }
            canvas.replaceChildren();
            activeBlocks = [];
            blockCounter = 0;
            parsedConfig.forEach((blockData) => createFormulaBlock(blockData));
            placeholder.classList.toggle('hidden', activeBlocks.length > 0);
        } catch (error) {
            alert(`Unable to load JSON profile: ${error.message}`);
            console.error(error);
        } finally {
            importFile.value = '';
        }
    };
    reader.onerror = () => {
        alert('Unable to read the selected file.');
        importFile.value = '';
    };
    reader.readAsText(file);
}
