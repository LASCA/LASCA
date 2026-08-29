# LASCA Suite - Geodesy Edition

[![React](https://img.shields.io/badge/React-19.2.5-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0.10-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

LASCA Suite is a precision geodesy and topographic surveying platform built for engineers, surveyors, and technical teams who need reliable field computation, network adjustment, and stakeout workflows in a single digital environment. Designed to reduce manual calculation overhead while preserving engineering rigor, it brings together angle observation processing, traverses, leveling, tachymetry, and coordinate-based project management into one modern interface.

The application supports common surveying tasks such as station observations, traverse adjustment, trigonometric and geometric leveling, angle/azimuth calculation, point stakeout, and report generation. It blends a Python scientific backend with a React + Tailwind frontend to deliver computational accuracy and a clear operational workflow.

---

## Overview

LASCA solves the practical problems of modern surveying and civil engineering projects by providing a structured digital workflow for:

- Coordinate and network processing for topographic surveys
- Adjustment of angular observations and station measurements
- Traverse computation in planar coordinates and height systems
- Leveling workflows for forward and backward observations
- Tachymetric point determination and plotting
- Stakeout/charaxí planning and output generation
- Excel-driven project intake and reporting

This repository combines the frontend experience with the computational engine behind the scenes. In the codebase, the geodetic logic lives primarily in the Python modules under the `code/` directory, while the user-facing workflows and project management interfaces are implemented in the React application under `frontend/src/`.

---

## Key Modules & Features

### 1. Dashboard & Project Workspace

The dashboard is the project command center. It enables:

- selecting or creating a project workspace
- importing survey data from Excel templates
- visualizing existing traverse and measurement data on a coordinate map
- summarizing counts for station measurements, traverses, and stakeout points
- maintaining project-level persistence across sessions

This module is implemented around the dashboard and project management utilities, and it connects to the backend project storage and loading APIs.

### 2. Station Measurements

This section brings together the fundamental angular and observation tools used at a survey station.

- Goniometry: input of face I / face II observations, averaging, residual analysis, and angular correction routines
- Station Adjustment: least-squares style processing of directional observations to compute adjusted horizontal angles and standard deviations
- Trigonometric Leveling: slope distance and zenith angle reduction to determine height differences
- Geometric Leveling: forward/backward leveling workflow with checks and height transfer logic

These screens are mapped to the app modules `gwniometriseis`, `Adjustment`, `trig_leveling`, and `leveling`.

### 3. Basic Calculations

The `Basic_Calc` module acts as a calculator toolkit for common geodetic operations, including:

- angle unit conversions between radians, grads, and degrees
- basic coordinate and azimuth problems
- intersection and resection calculations
- scale factor handling and related reduction formulas

This is a compact engineering utility set for rapid field and office checks.

### 4. Traverse Computation

The traverse module handles coordinate and orientation calculations for closed or open traverses. It supports:

- station and bearing/distance entries
- coordinate propagation for X/Y computation
- scale factor modes and adjustment options
- traverse metrics, closure checks, and generated visual outputs

The implementation is split between the React UI (`Traverse.jsx`) and the backend processing functions in `code/data_proccessing.py` and `code/main_4_app.py`.

### 5. Traverse Height / Elevation Workflow

This functionality focuses on height propagation and elevations along traverses. It is designed to support survey tasks where reduced levels and vertical control are critical, including route-based leveling and height transfer from one station to the next.

### 6. Tachymetry

The tachymetry module enables point determination from horizontal and vertical readings, station orientation, and slope distances. It supports:

- station-based measurement grouping
- orientation selection and local detail processing
- reduced point coordinates and plotted survey geometry
- data export for downstream workflows and DXF-style output

This is one of the most operationally rich parts of the suite because it transforms raw field observations into coordinate points suitable for later mapping or stakeout operations.

### 7. Stakeout / Charaxí

The stakeout module is intended for transferring design coordinates into the field. It allows users to:

- define a station and backsight reference
- calculate azimuth and offset relationships
- prepare point lists for staking out positions
- generate visual stakeout previews and PDF reports

This is directly aligned with field engineering execution and final construction layout tasks.

### 8. Reporting & Data Export

The application includes output generation for:

- PDF reports
- image exports of plots and charts
- DXF-like export flows for topographic geometry
- Excel or XLSX project intake

The codebase uses Python libraries such as `reportlab`, `ezdxf`, and Excel tooling to produce engineering deliverables.

---

## Tech Stack

| Category | Stack | Notes |
| --- | --- | --- |
| Frontend Core | React 19.2.5 | Modern component-based UI |
| Build Tool | Vite 8.0.10 | Fast development and build pipeline |
| Styling | Tailwind CSS 4.2.4 | Utility-first design system |
| Component Icons | Lucide React 1.14.0 | Survey, mapping, dashboard controls |
| Data Fetching | Axios 1.16.1 | API interactions with Flask backend |
| Query / State Utility | TanStack React Query 5.100.9 | Data caching and coordination |
| Visualization | Recharts, html2canvas, react-zoom-pan-pinch | Charts, plots, map previews |
| Spreadsheet Support | xlsx, xlsx-js-style | Excel input/output processing |
| UX / Feedback | react-hot-toast | Notifications and status feedback |
| Backend | Python + Flask 3.1.3 | API orchestration and geodetic computations |
| Scientific Computing | Pandas, NumPy, SciPy, Matplotlib | Survey analysis and plot generation |
| PDF / CAD | reportlab, ezdxf | Reporting and export generation |
| Data Modeling | openpyxl, Excel / JSON project storage | Project persistence and templates |

---

## Architecture & Directory Structure

```text
survey_project/
├── README.md
├── requirements.txt
├── SurveyProject.spec
├── build/
│   └── SurveyProject/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Header.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Adjustment.jsx
│       │   ├── Basic_Calc.jsx
│       │   ├── Traverse.jsx
│       │   ├── Tachymetry.jsx
│       │   ├── gwniometriseis.jsx
│       │   ├── leveling.jsx
│       │   ├── traverse_height.jsx
│       │   ├── traverse_lev.jsx
│       │   ├── traverse_trig_lev.jsx
│       │   ├── trig_leveling.jsx
│       │   ├── charaxi.jsx
│       │   ├── project_manager.jsx
│       │   └── animations/
│       └── utils/
│           └── excel_template.js
├── code/
│   ├── main_4_app.py
│   ├── main.py
│   ├── data_proccessing.py
│   ├── project_manager.py
│   ├── configuration_settings.py
│   ├── visualization.py
│   ├── vis_4_app.py
│   ├── gwn.py
│   └── assets/
│       └── LASCA-logo-red-blue-1024.png
├── data/
│   └── diafora/
├── Topo_Workspace/
├── Logo_library/
├── Lasca.venv/
└── .gitignore (if present in the repo root)
```

### Architectural view

The codebase follows a two-layer design:

- Frontend layer: React application for interactive workflow, forms, reports, and visualization
- Backend layer: Flask API with geodetic and computational logic, project persistence, and report exports

This keeps the domain logic separate from the UI while supporting a fast survey-analysis workflow and easy project-level state management.

---

## Getting Started

### Prerequisites

- Node.js 20.x or later recommended
- npm 10.x or later
- Python 3.10+ recommended for the backend processing environment
- A local terminal with access to the repository

### 1. Clone the repository

```bash
git clone <repository-url>
cd survey_project
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The frontend is typically served by Vite on a local port such as `http://localhost:5173`.

### 4. Run the Python backend

From the project root, install the backend requirements and launch the Flask service:

```bash
pip install -r requirements.txt
python code/main_4_app.py
```

The backend API is expected to run locally on `http://127.0.0.1:5000` and communicates with the frontend through CORS-enabled endpoints.

> Note: The full LASCA Suite experience requires both the frontend and backend processes to be running concurrently for calculations, reports, and project state saving.

---

## Usage Workflow

A typical engineering workflow in LASCA follows this pattern:

1. Create or open a survey project in the dashboard
2. Import data from an Excel workbook or manual entry forms
3. Fill in geodetic observations for goniometry, traverse, or leveling
4. Run the backend computation modules
5. Review residuals, metrics, and visual plots
6. Export reports or generate downstream outputs for field stakeout

This structure reflects the application’s emphasis on accuracy, repeatability, and a controlled workflow for surveying tasks.

---

## Team & Credits

### Laska Developers

LASCA Suite was developed and maintained by the Laska Developers team with a focus on geospatial engineering workflows, surveying logic, and software usability for field and office teams.

This section is intentionally prepared for project ownership and contact details:

- Team Name: Laska Developers
- Contact: Add project contact details here
- Email: add@company.example
- Website / Portfolio: Add URL here
- GitHub / Organization: Add repository or organization link here

The project currently includes author references in the app’s about panel, with placeholders for broader team coordination and formal ownership documentation.

---

## License

This project is currently documented as a standard open-source MIT-style project for distribution and reuse, with the understanding that commercial or proprietary use may require formal legal review.

If this repository is intended to remain proprietary, replace the license text with your organization’s legal licensing terms.

```text
MIT License

Copyright (c) 2026 Laska Developers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Summary

LASCA Suite - Geodesy Edition is a practical, engineering-focused surveying toolkit for modern topographic work. It blends precision calculations, structured project workflows, and clear digital interfaces to support surveyors, civil engineers, and technical teams working with coordinates, elevations, bearings, and field stakeout logic.

Its design reflects the realities of geodetic operations: iterative computation, data traceability, reporting, and field-to-office continuity.
