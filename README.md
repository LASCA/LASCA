# LASCA

[![React](https://img.shields.io/badge/React-19.2.5-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0.10-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success)]()

LASCA is a desktop-oriented surveying and geodetic computation platform for field and office workflows. It combines a modern React interface with a Python and Flask backend to manage survey projects, compute measurements, generate engineering reports, and export CAD and PDF outputs for common geodetic tasks.

## Overview

LASCA is designed for surveyors, civil engineers, and technical teams working with horizontal and vertical control, station observations, coordinate calculations, and project-based data management. The application supports both manual data entry and Excel-driven workflows while persisting project state locally so each job remains organized and reproducible.

The system is structured around a project-centric workflow:

- Create and manage survey projects with metadata and stored observations.
- Perform calculations for traverse, leveling, goniometry, trigonometric height, tachymetry, and stakeout.
- Visualize computed geometry through charts, coordinate plots, and map overlays.
- Export results to PDF, DXF, and image formats when supported by each module.
- Package the application as a desktop Windows release using PyInstaller and Inno Setup.

## Key Features

- Project dashboard with project creation, loading, deletion, and summary information.
- Multi-module geodetic workflow covering goniometry, traverse, traverse height, leveling, trig-leveling, tachymetry, and stakeout.
- Angular and linear observation processing with closure and tolerance calculations.
- Coordinate and height propagation for traverse and leveling networks.
- Geodetic utilities for angle, unit, azimuth, intersection, resection, and scale-factor tasks.
- Interactive visuals using Recharts and Leaflet for coordinate plotting and map-based inspection.
- PDF report generation for computations and survey summaries.
- DXF export support for traverse and tachymetry data.
- Excel import support and template generation for structured field data.
- Persistent JSON-based project storage with separate user workspace directories.
- Desktop packaging for Windows through PyWebView, PyInstaller, and Inno Setup.
- User feedback submission with attachments and notification handling.

## Tech Stack

| Layer | Technologies | Notes |
| --- | --- | --- |
| Frontend | React 19, Vite 8, JavaScript/JSX | Main desktop-style UI and workflow navigation |
| Styling | Tailwind CSS 4, PostCSS, Autoprefixer | Layout and responsive styling |
| Visualization | Recharts, Leaflet, React Leaflet, proj4 | Charts, coordinate plots, and EPSG:2100 conversions |
| UI utilities | Axios, Lucide React, React Hot Toast, html2canvas | API access, icons, notifications, and screenshots |
| Spreadsheet and data | xlsx, xlsx-js-style | Excel templates and import/export support |
| Backend | Python 3.10+, Flask, Flask-CORS | Local API and calculation server |
| Surveying and analysis | NumPy, Pandas, SciPy, Matplotlib | Numerical processing and plotting |
| Report and CAD export | ReportLab, ezdxf | PDF and DXF generation |
| Desktop runtime | PyWebView | Embedded desktop application window |
| Packaging | PyInstaller, Inno Setup 6 | Windows executable and installer build |

## Prerequisites

Before running the project, ensure the following are installed:

- Node.js 18+ and npm
- Python 3.10 or newer
- Git
- A terminal such as PowerShell, Command Prompt, or Git Bash
- Windows 10+ recommended for the packaged desktop release

## Installation and Local Setup

### 1) Clone the repository

```bash
git clone https://github.com/<your-user>/<your-repo>.git
cd survey_project
```

### 2) Install frontend dependencies

```powershell
cd frontend
npm install
```

### 3) Create and activate a Python environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

> The repository may include a local `Lasca.venv` directory for development, but a clean `.venv` is recommended for a standard setup.

### 4) Set up environment variables

The application loads environment variables from a `.env` file when present.

Supported variables include:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
RESEND_API_KEY=your_key_here
NOTIFICATION_EMAIL=admin@example.com
FEEDBACK_UPLOAD_FOLDER=./feedback_uploads
```

For normal local development, `VITE_API_BASE_URL` is usually only needed when the frontend and backend run on different ports.

### 5) Run the backend

```powershell
python code\main_4_app.py
```

This starts the Flask API and opens the desktop window via PyWebView.

### 6) Run the frontend in development mode

Open a second terminal and run:

```powershell
cd frontend
npm run dev
```

If the frontend is served separately from the backend, set the environment variable before running Vite:

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:<backend-port>"
cd frontend
npm run dev
```

## Production and Build

### Frontend build

```powershell
cd frontend
npm run build
```

This creates the production bundle in `frontend/dist`.

### Preview the production build

```powershell
cd frontend
npm run preview
```

### Lint the frontend

```powershell
cd frontend
npm run lint
```

### Windows desktop release

A full Windows packaging workflow is included in the repository:

```powershell
.\build_release.ps1
```

The script performs the following:

1. Builds the React frontend in `frontend`
2. Runs PyInstaller using `LASCA.spec`
3. Compiles the installer with Inno Setup 6
4. Produces the final installer in `installer-output\LASCA_Setup.exe`

> This release workflow expects a valid Python environment at `Lasca.venv\Scripts\python.exe` and an Inno Setup installation containing `ISCC.exe`.

## Project Structure

```text
survey_project/
├── LICENSE
├── README.md
├── requirements.txt
├── build_release.ps1
├── LASCA.spec
├── installer/
│   └── LASCA_Setup.iss
├── code/
│   ├── main_4_app.py
│   ├── main.py
│   ├── data_proccessing.py
│   ├── project_manager.py
│   ├── visualization.py
│   ├── vis_4_app.py
│   ├── configuration_settings.py
│   ├── assets/
│   └── feedback_uploads/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── config.js
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       └── utils/
├── data/
├── dist/
├── installer-output/
├── Topo_Workspace/
└── LASCA/
```

## License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for the full legal text.

## Project Credits

LASCA was developed by students and contributors in the Surveying and Geomatics Engineering domain at Aristotle University of Thessaloniki (AUTH). The project credits the following contributors:

| Contributor | Profile |
| --- | --- |
| Alexandros Karachles | [GitHub](https://github.com/Neversplit2) |
| Ilias Saoulias | [GitHub](https://github.com/iliasaou) |
| Savvas Tsigou | [GitHub](https://github.com/Savvas-Tsigou) |

## Notes

- Project data is stored in user-specific directories under the local Windows home profile, not inside the source tree.
- Sample files under `Topo_Workspace` are development and demo data and should not be treated as production output.
- The application is primarily focused on surveying and geodetic workflows, with report and export generation tailored to that domain.
