# CNC Hardware Studio

A browser-based collection of CNC motion, mechanical, and electrical calculators. The main Studio lets you combine numeric formulas in ordered blocks, pass earlier results into later calculations, and graph parameter sweeps.

## Open the Studio

The app uses native browser JavaScript modules, so serve this folder over HTTP rather than opening the HTML directly with a `file://` URL. For example, with Python installed:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. The homepage is `index.html` and links to the user guide at `cncHardwareTutorial.html`.

The app's Tailwind stylesheet is built locally and included as `cncHardwareStyles.css`; it does not need to download styles at runtime. Keep that file next to the HTML documents. The Studio itself has no runtime npm dependency. Once the local files and server are available, it can be used without an internet connection.

## Features

- Formula blocks for direct-drive and belt-driven screw steps/mm and servo counts/mm, pure-belt steps/mm, motion limits, straightness error (including comparison scaled to 500 mm), backlash compensation pulses from repeated measurements, inertia, torque, power, DC/AC current and power (including single- and three-phase power factor with ratio/percentage display, peak-value/phase-angle AC power, DC and AC Ohm’s law, series/parallel resistor and capacitor equivalents, inductive and capacitive reactance, resistor heating, grouped-load DC supply sizing, shaft-to-electrical power conversion, and configurable DC wire-drop diagnostics), RLC behavior and quality factor, ideal transformer ratios, and unit conversions.
- Ordered calculation pipelines: later blocks can use outputs from earlier blocks as inputs.
- Automatically groups blocks connected by piped results and marks upstream blocks that feed multiple calculations as shared foundations.
- A backlash calculator that averages 18 measurements for one axis and converts the measured travel into whole compensation pulses using the supplied procedure's unit factors.
- Frequency/period/angular-frequency formula blocks and a standalone [interactive physics dashboard](./PhysicsDashboard.html) for AC RLC phasors and 3D Lorentz-force vectors.
- Parameter-sweep graphs with explanations for the selected input, range, and point count, including torque/inertia and acceleration/deceleration current estimates. Related enabled formula graphs are automatically combined in a master chart when they use the same input, range, and number of points.
- A spreadsheet-style straightness plot showing measured readings and the straight line between the first and last readings along the measured length.
- A final graph gallery for enabled graph blocks.
- Collapsible, configurable hardware reference charts for angle-to-linear tolerance (including arcseconds with selectable SI output units) and speed, plus stepper/servo axis resolution.
- A quick-reference unit converter for length (including thou and tenths), mass, area, volume, temperature, angle, speed, mechanical, pressure, and electrical units; it excludes fuel-economy conversions.
- JSON import and export for saving a pipeline configuration.
- An importable [industrial spindle power-distribution profile](./industrial-spindle-power-distribution.json) demonstrating motor/drive efficiency, DC PSU current, DC wire-drop warnings, and an independent three-phase spindle-current estimate.
- Plain-language input help describing each parameter in the context of its formula.

The calculation library is metric-first. Input tooltips and the tutorial describe required units, including when datasheet values need conversion.

## Rebuild the offline stylesheet

Node.js and npm are only needed to regenerate CSS after changing the HTML utility classes:

```sh
npm install
npm run build:css
```

This regenerates `cncHardwareStyles.css` from `tailwind.input.css` and the class names used in the Studio and tutorial. Commit or distribute the generated CSS with the HTML files so normal users do not need Node.js or npm.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Main browser-based formula pipeline and graphing Studio; the GitHub Pages homepage. |
| `cncHardwareMath.js` | ES module containing the CNC mechanical, electrical, motion, conversion, and calibration formulas. |
| `cncHardwareTutorial.html` | In-app tutorial and calculation/safety guidance. |
| `PhysicsDashboard.html` | Standalone interactive AC phasor, waveform, and 3D Lorentz-force visualizer; uses `PhysicsFormulas.js`. |
| `PhysicsFormulas.js` | Complex-number, 3D vector, AC phasor, and electromagnetic force helpers used by the physics dashboard. |
| `cncHardwareStyles.css` | Generated, local Tailwind stylesheet used by the Studio and tutorial pages. |
| `tailwind.input.css` | Tailwind v4 stylesheet entry point and HTML content sources. |
| `package.json`, `package-lock.json` | CSS build command and locked build-tool dependencies. |
| `cncStepsCalculator.js` | Separate steps/mm calculator with belt-driven screw, direct screw, pure belt, conversion, and calibration examples. |

Other JavaScript files in this folder are standalone exercises and are not loaded by the Studio. In particular, `main.js` contains recursive file-renaming behavior tied to a hard-coded directory; inspect it carefully before running it.

## Standalone steps calculator

`cncStepsCalculator.js` includes example calculations and prints their results when run with Node.js:

```sh
node cncStepsCalculator.js
```

The formulas use:

- **Belt-driven screw:** `motorSteps × microstepping × (drivenTeeth / driveTeeth) / screwLead`
- **Direct screw:** `motorSteps × microstepping / screwLead`
- **Pure belt:** `motorSteps × microstepping / (beltPitch × pulleyTeeth)`

The screw lead and belt pitch are entered in millimeters; the results are steps per millimeter. The script also provides steps/mm-to-steps/inch conversion and a physical-move calibration helper.

## Engineering and safety note

Results are estimates based on the inputs and assumptions documented in the tutorial and formula library. They are not a substitute for manufacturer data, qualified engineering review, applicable electrical codes, wire ampacity checks, or machine testing. In particular, the acceleration/deceleration bus-current graph is an idealized estimate and does not model all motor, driver, thermal, or regenerative-bus behavior.
