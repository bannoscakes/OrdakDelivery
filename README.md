# OrdakDelivery
OrdakDelivery – Self‑hosted delivery
management platform
OrdakDelivery is Bannoscakes’ back‑office application for managing deliveries, pickups and drivers. It is
built with a microservice architecture that integrates Mapbox’s routing and navigation services, Shopify
for order import/fulfilment and PostGIS for spatial data storage. This repository contains the backend
(API server) and service orchestration code that powers the Ordak UI frontend.
Goal
Enable merchants to create, optimise and dispatch delivery runs without relying on expensive
third‑party platforms. The system supports both local deliveries and pickups and provides a clear
upgrade path—from fully self‑hosted routing engines (e.g. OSRM/VROOM) to Mapbox’s hosted APIs for
1
higher quality results and worldwide coverage .
Key features
•
•
•
•
•
•
Order ingestion and management – Import orders from Shopify via webhooks or API calls, or
create them manually. Each order stores delivery/pickup dates, time windows, addresses and
notes.
Route optimisation – Compute efficient routes using Mapbox’s Optimisation API (vehicle
routing), Directions API (point‑to‑point navigation) and Matrix API (pre‑computed distance
matrices) 2 3
. Supports constraints like time windows, capacities and driver shifts.
Mapping and geocoding – Use Mapbox GL JS on the frontend for interactive maps and
Mapbox’s geocoding service to convert addresses into coordinates. Alternatively, you can
4
self‑host Pelias for geocoding .
Driver and fleet management – Manage vehicles, drivers and their availability. Assign runs,
5
generate PDFs/CSVs and track drivers in real time through optional Traccar integration .
Customer notifications – Trigger SMS/email notifications when a driver starts a route, is
approaching or when a delivery is completed.
Shopify integration – Sync order fulfilment back to Shopify after delivery and store delivery
preferences in order metafields. A custom storefront extension lets customers choose delivery or
pickup dates during checkout.
• 6
Zone and isochrone support – Define delivery zones using Mapbox’s Isochrone API or
custom polygons and automatically generate runs per zone.
Architecture
OrdakDelivery is composed of several microservices written in Node.js (you may choose another stack).
Each service can be scaled independently and communicates via REST APIs or message queues.
1
Service Description
Order service
Stores orders, customers and scheduling preferences in a PostgreSQL/PostGIS
7
. Listens to Shopify webhooks for order creation and fulfilment
database updates.
Routing
service
Interfaces with Mapbox’s Directions, Optimisation and Matrix APIs to generate
and store route plans. Contains logic for zone grouping and future dynamic
traffic support.
Geocoding
service
Resolves addresses to lat/long using either Pelias (self‑hosted) or Mapbox’s
8
geocoder .
Tracking
service
Optionally integrates with Traccar for real‑time GPS tracking and uses Mapbox
9
Map Matching API to clean GPS traces .
Notification
service
Sends SMS/email updates to customers when statuses change. Integrates with
Twilio/SendGrid or other providers.
Shopify app Handles checkout UI extension, writes delivery preferences to metafields and
updates fulfilments post‑delivery.
The OrdakDelivery backend exposes APIs consumed by the Ordak UI (a separate repository) and by the
mobile driver app. For a complete overview of this architecture, consult the mvp_plan_updated.md
document provided alongside this project.
🛠 Prerequisites
•
•
•
Node.js 18+ and package manager (npm or yarn)
• 7
PostgreSQL 13+ with PostGIS extension installed
Mapbox account and access token – sign up at mapbox.com and retrieve your token. Mapbox
1
services offer generous free tiers for routing and matrix requests .
Shopify partner account – to create custom apps for order import and storefront extensions.
Setup and running
1.
Clone this repository
git clone https://github.com/bannoscakes/OrdakDelivery.git
cd OrdakDelivery
2.
Install dependencies
npm install
# or
yarn install
3.
Configure environment variables
2
Create a .env file in the project root and define the following variables:
DATABASE_URL=postgresql://username:password@localhost:5432/ordakdelivery
MAPBOX_ACCESS_TOKEN=your_mapbox_token
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
TRACCAR_API_URL=https://traccar.example.com (optional)
TRACCAR_API_TOKEN=your_traccar_token (optional)
Adjust the database connection string and optional Traccar settings as needed. Additional environment
variables may be required for email/SMS providers and message queue configuration.
1.
Run database migrations (if using a migration tool such as Prisma, Knex or Sequelize). For
example:
npx prisma migrate deploy
2.
Start services
npm run dev
or start individual services if using a monorepo structure. Services will listen on different ports
and communicate via API calls.
Additional documentation
This repository accompanies two documents that provide further guidance:
•
•
MVP Plan (with Mapbox integration) – outlines the project’s vision, technology choices and
high‑level design for building the platform. It also compares open‑source routing tools with
Mapbox and explains how the system evolves over time.
Documentation Checklist – lists the technical documentation that should be produced for each
microservice (API specs, data models, deployment steps, etc.).
You can obtain these documents from the previous chat attachments ( mvp_plan_updated.md documentation_checklist.md ). They are not included in the repository by default.
and
Contributing
We welcome contributions, bug reports and feature requests. Please fork the repo, create a branch for
your changes and submit a pull request. Make sure to run the linter and include unit tests where
appropriate.
3
License
This project is proprietary software developed by Bannoscakes. All rights reserved. If you wish to use
this project commercially or contribute to it, please contact the maintainers.
1
Mapbox vs Google Maps — What are the differences?
https://www.softkraft.co/mapbox-vs-google-maps/
2
Optimization API v2 | API Docs | Mapbox
https://docs.mapbox.com/api/navigation/optimization/
3
Matrix API | API Docs | Mapbox
https://docs.mapbox.com/api/navigation/matrix/
4 8
Pelias Geocoder
https://pelias.io/
5
GPS Tracking Software - Free and Open Source System - Traccar
https://www.traccar.org/
6
Isochrone API | API Docs | Mapbox
https://docs.mapbox.com/api/navigation/isochrone/
7
PostGIS
https://postgis.net/
9
Map Matching API | API Docs | Mapbox
https://docs.mapbox.com/api/navigation/map-matching/
4
