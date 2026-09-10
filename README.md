# LASCA

[![React](https://img.shields.io/badge/React-19.2.5-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0.10-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)

LASCA is a desktop-oriented surveying and geodetic computation suite for field and office workflows. It brings project management, station observations, coordinate computation, leveling, tachymetry, stakeout preparation, visualization, and engineering report generation into one application.

The application combines a React and Vite interface with a Python and Flask computational backend. Projects are stored as JSON and organized in a per-user workspace, so survey data remains separate from the installed application and source tree.

## Project Overview

LASCA is designed for surveyors, civil engineers, and technical teams working with horizontal and vertical control, topographic observations, coordinate systems, and field layout. Its workflow supports both manual data entry and Excel-based project intake.

The application provides:

- A project dashboard with data import, project actions, summary counts, and coordinate visualization.
- Separate calculation modules for observations, traverses, leveling, tachymetry, and stakeout.
- Persistent project state with automatic saving through the Flask API.
- PDF, image, DXF, and spreadsheet-related workflows where supported by each module.
- A desktop runtime based on PyWebView for the packaged application.

## Key Features

### Project Dashboard and Management

- Create, open, list, and delete survey projects.
- Save project metadata such as scale, terrain, survey class, designer, employer, and location.
- Automatically persist the active project state.
- Import supported Excel worksheets into the relevant modules.
- View traverse stations and tachymetric detail points in a coordinate chart or Leaflet map.

### Station Measurements

- **Goniometry:** process face I and face II angular observations.
- **Station adjustment:** calculate adjusted observations and station statistics, including residual and standard-deviation information.
- **Trigonometric height:** calculate height differences from slope-distance and zenith-angle observations and export a report.
- **Geometric leveling:** process forward and backward leveling observations, calculate height differences, and report the height misclosure.

### Traverse and Height Workflows

- **Horizontal traverse:** calculate X/Y coordinates, traverse totals, angular and linear closure values, and tolerance-related metrics.
- **Traverse height:** calculate height propagation along a traverse.
- **Traverse outputs:** generate a traverse report, a visualization, and DXF export data.

### Tachymetry

- Manage tachymetric stations and observations.
- Group observations by occupied station and orientation.
- Calculate detail-point coordinates and elevations.
- Export tachymetric results and DXF data.

### Stakeout

- Define an instrument station and backsight.
- Manage target design points.
- Calculate stakeout direction and distance values.
- Generate stakeout report output.

### Basic Geodetic Calculations

The basic-calculation module provides tools for:

- Angle and unit calculations.
- Coordinate and azimuth problems.
- Intersection and resection calculations.
- Scale-factor calculations.

### Visualization, Reporting, and Feedback

- Recharts coordinate visualization and Leaflet map display.
- PDF reports for adjustment, traverse, stakeout, and trigonometric leveling workflows.
- DXF export workflows for traverse and tachymetry data.
- Toast notifications, loading states, project-switching feedback, and responsive navigation.

## Tech Stack and Architecture

| Layer | Technologies | Purpose |
| --- | --- | --- |
| Frontend | React 19, Vite 8, JavaScript/JSX | Application UI and workflow navigation |
| Styling | Tailwind CSS 4, PostCSS | Layout, theming, and responsive interface styling |
| Frontend visualization | Leaflet, React Leaflet, Recharts, proj4 | Maps, coordinate plots, and EPSG:2100 conversion |
| Frontend utilities | Axios, xlsx, xlsx-js-style, html2canvas, react-hot-toast, Lucide React | API calls, Excel intake, visual output, notifications, and icons |
| Backend | Python, Flask 3.1, Flask-CORS | Local API, project persistence, and application orchestration |
| Survey computation | NumPy, Pandas, SciPy, Matplotlib, project-specific Python modules | Numerical processing, tabular data, calculations, and plots |
| Export and desktop runtime | ReportLab, ezdxf, PyWebView | PDF reports, DXF output, and the desktop window |
| Packaging | PyInstaller and Inno Setup 6 | Windows executable and installer builds |

### Application Architecture

The frontend keeps the active project state in `frontend/src/App.jsx` and sends calculation requests to the Flask API. The backend routes are implemented in `code/main_4_app.py`; domain calculations are primarily in `code/data_proccessing.py` and the visualization modules.

The backend exposes endpoints for project management, goniometry, adjustment, traverse, traverse height, tachymetry, stakeout, basic calculations, geometric leveling, and trigonometric leveling. The frontend API base URL is configurable through `VITE_API_BASE_URL`; when it is unset, the frontend uses a same-origin base URL.

## Installation and Running Locally

### Prerequisites

- Windows 10 or later is recommended for the packaged workflow.
- Node.js and npm for frontend development.
- Python 3.10 or newer recommended for the backend environment.
- PowerShell or another terminal available on the system path.

### Install the frontend

From the repository root:

```powershell
Push-Location frontend
npm install
Pop-Location
```

### Create a Python environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The repository also contains a pre-existing `Lasca.venv` directory in some development environments. A new environment is preferred for a clean setup; do not commit virtual-environment files.

### Run the desktop/backend application

```powershell
python code\main_4_app.py
```

The backend selects an available loopback port, starts Flask on `127.0.0.1`, and opens a PyWebView window. For the packaged experience, the backend serves the built frontend from `frontend/dist`.

### Run the Vite frontend during development

In a separate terminal:

```powershell
Push-Location frontend
npm run dev
Pop-Location
```

For a split frontend/backend development session, set `VITE_API_BASE_URL` to the loopback URL and port reported by the Flask process before starting Vite:

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:<backend-port>"
Push-Location frontend
npm run dev
Pop-Location
```

The frontend package also provides these scripts:

```powershell
npm run build    # Create frontend/dist
npm run preview  # Preview the production frontend build
npm run lint     # Run ESLint
```

### Build the Windows release

The repository includes an end-to-end PowerShell release script:

```powershell
.\build_release.ps1
```

This script builds the Vite frontend, runs PyInstaller using `LASCA.spec`, and compiles the installer with Inno Setup 6. It expects the repository's `Lasca.venv` Python executable and an available `ISCC.exe` installation. The installer is written to `installer-output\LASCA_Setup.exe` when all three build stages succeed.

## Project Structure and Storage

```text
survey_project/
├── README.md
├── requirements.txt
├── build_release.ps1
├── LASCA.spec
├── installer/
│   └── LASCA_Setup.iss
├── code/
│   ├── main_4_app.py
│   ├── data_proccessing.py
│   ├── project_manager.py
│   ├── gwn.py
│   ├── visualization.py
│   ├── vis_4_app.py
│   └── assets/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── config.js
│       └── components/
└── data/
```

### User project storage

The backend stores projects below the current user's home directory:

```text
C:\Users\<username>\LASCA\
└── <project-name>\
    ├── project_data.json
    ├── data\
    ├── results\
    │   ├── charaxi\
    │   ├── odeusi\
    │   └── taxymetria\
    └── reports\
        ├── charaxi\
        ├── odeusi\
        └── taxymetria\
```

This path is generated dynamically with Python's `Path.home()` and therefore changes with the Windows user account. It is not tied to the repository location or the installation directory. The `Topo_Workspace` directories included in the repository are development/sample data and should not be treated as the production storage root.

`project_data.json` contains project metadata and the persisted application state, including observations, traverse data and metrics, tachymetry data, stakeout data, goniometry, leveling data, and trigonometric-height data. Calculation endpoints may also write files such as `latest_traverse.json` and `latest_leveling.json` inside the active project directory.

## Development Team

LASCA was developed by students of Surveying and Geomatics Engineering at Aristotle University of Thessaloniki (AUTH). The application credits the following LASCA Developers:

| Contributor | Contact |
| --- | --- |
| Alexandros Karachles | [GitHub](https://github.com/Neversplit2) |
| Ilias Saoulias | [GitHub](https://github.com/iliasaou) |
| Savvas Tsigou | [GitHub](https://github.com/Savvas-Tsigou) |

## License and Distribution

No `LICENSE` file is currently present in this repository. Licensing and redistribution terms should be confirmed with the project owners before publishing or distributing the software.