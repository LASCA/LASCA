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

### Application Architecture

The frontend keeps the active project state in `frontend/src/App.jsx` and sends calculation requests to the Flask API. The backend routes are implemented in `code/main_4_app.py`; domain calculations are primarily in `code/data_proccessing.py` and the visualization modules.

The backend exposes endpoints for project management, goniometry, adjustment, traverse, traverse height, tachymetry, stakeout, basic calculations, geometric leveling, and trigonometric leveling. The frontend API base URL is configurable through `VITE_API_BASE_URL`; when it is unset, the frontend uses a same-origin base URL.

## Installation and Running Locally (website)

This branch (`web-pages`) is the website at lasca.gr. The Windows program lives in the `redesign-desktop-2` branch.

### Prerequisites

- Python 3.10 or newer, Node.js and npm.

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r deploy/requirements-web.txt
copy code\.env.example code\.env      # then fill in the values
python code\main_4_app.py               # http://127.0.0.1:5000
```

Test accounts for local work: `python code\dev_tools.py seed` (`reset` clears them).

### Frontend

```powershell
Push-Location frontend
npm install
npm run build    # the Flask server serves frontend/dist
Pop-Location
```

During development you can also run `npm run dev` with `VITE_API_BASE_URL=http://127.0.0.1:5000`.

### Tests

```powershell
python code\tests\test_security.py
python code\tests\test_collab.py
python code\tests\test_history.py
python code\tests\test_team_gate.py
```

### Deploy

See `deploy/README.md` (Oracle Cloud, nginx, gunicorn, HTTPS). Updates: `bash deploy/update.sh` on the server.

## Project Structure

```text
LASCA/
├── LICENSE
├── code/
│   ├── main_4_app.py        # Flask app: pages, calculations, reports
│   ├── auth_security.py     # accounts, 2FA, e-mail verification, desktop sign-in
│   ├── collab.py            # shared projects, members, history
│   ├── history_diff.py      # detailed change history
│   ├── security.py          # security headers, origin checks, rate limits
│   ├── team_gate.py         # optional team password for the test period
│   ├── data_proccessing.py  # survey computations
│   ├── vis_4_app.py         # plots
│   ├── project_manager.py   # project storage
│   ├── dev_tools.py         # local test accounts
│   └── tests/
├── deploy/                  # server setup and update scripts
└── frontend/                # React + Vite
    ├── public/              # icons, landing-page videos
    └── src/
```

### User project storage

On the server, projects are stored under `LASCA_PROJECTS_DIR` (see `code/.env.example`), one folder per project with `project_data.json`.

## Development Team

LASCA was developed by students of Surveying and Geomatics Engineering at Aristotle University of Thessaloniki (AUTH). The application credits the following LASCA Developers:

| Contributor | Contact |
| --- | --- |
| Alexandros Karachles | [GitHub](https://github.com/Neversplit2) |
| Ilias Saoulias | [GitHub](https://github.com/iliasaou) |
| Savvas Tsigou | [GitHub](https://github.com/Savvas-Tsigou) |

## License

LASCA Source-Available License — see `LICENSE`.