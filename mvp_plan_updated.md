# MVP SaaS Routing Platform (with Mapbox Integration)

## Overview

This plan updates the original open-source architecture to incorporate Mapbox's cloud-hosted services. In the first version, core routing was handled by self-hosted engines such as OSRM and VROOM, geocoding used Pelias, and the UI relied on MapLibre/Martin. Because Mapbox offers high-quality routing, optimisation, matrix and map-matching services with [generous free tiers](https://www.softkraft.co/mapbox-vs-google-maps/), it can replace or augment parts of the stack without fundamentally changing the microservice architecture.

The goal of this Minimum Viable Product (MVP) is still to provide a self-service delivery management platform for merchants, but now using Mapbox for critical location logic to improve accuracy and reduce engineering complexity.

## Technology Stack and Mapbox Services

The platform leverages the following Mapbox services:

- **Mapbox Directions API** – Point-to-point routing with multiple profiles (driving, driving-traffic, walking, cycling)
- **Mapbox Optimisation API v2** – Vehicle routing problem solver (currently in beta)
- **Mapbox Matrix API** – Travel time/distance matrix computation
- **Mapbox Isochrone API** – Reachable area calculation for zone definition
- **Mapbox Map Matching API** – GPS trace cleaning and road network snapping
- **Mapbox GL JS** – Interactive web maps with custom styling via Mapbox Studio
- **Mapbox GL Native** – Mobile SDK for iOS/Android navigation

## System Architecture

The system retains a microservice pattern but introduces new services (and modifies existing ones) to interface with Mapbox:

### Order Management Service
Stores orders in the PostGIS database. Ingests orders via Shopify webhooks or CSV uploads. Reads customer-selected delivery dates and pick-up options from order metafields.

### Geocoding Service
Provides address lookup and reverse geocoding. Use Pelias as the default (for cost-control) and call Mapbox geocoding when Pelias fails or high-accuracy is required.

### Routing Service
Calls the Mapbox Directions API to generate point-to-point routes. The service accepts a list of coordinates, route profile (e.g., driving-traffic), and optional route preferences. It returns route geometry, duration, distance and turn-by-turn instructions.

### Optimisation Service
Submits vehicle routing problems to the [Mapbox Optimisation API](https://docs.mapbox.com/api/navigation/optimization/). For each optimisation job, it constructs a JSON document describing vehicles, stops and constraints (time windows, capacity, driver shifts, etc.). It then polls the API for results and stores the route plan in the database. For use cases where the Mapbox beta does not cover specific constraints or where costs must be controlled, VROOM can remain as an alternative engine.

### Matrix Service
Calls the [Mapbox Matrix API](https://docs.mapbox.com/api/navigation/matrix/) to generate travel time/distance matrices. This supports zone grouping or custom heuristics. The service caches matrix results to minimise API usage.

### Zone and Isochrone Service
Uses the [Mapbox Isochrone API](https://docs.mapbox.com/api/navigation/isochrone/) to compute reachable areas within specified times or distances. It generates polygons to define zones for automatic run creation and to visualise service coverage.

### Map Rendering Service
Provides interactive maps for administrators and drivers using Mapbox GL JS. Map styles are designed in Mapbox Studio, enabling custom branding and highlighting of zones, routes and real-time vehicle locations.

### Driver Mobile App
A cross-platform (e.g., React Native) app that fetches assigned routes, displays them with Mapbox GL Native (iOS/Android), and records real-time GPS traces. It can call the [Map Matching API](https://docs.mapbox.com/api/navigation/map-matching/) to snap traces to the road network, improving ETA accuracy. Drivers update delivery statuses, which triggers messages to customers and updates to Shopify.

### Real-time Tracking and Notifications
For vehicles with dedicated GPS units, you may still use the optional Traccar server; otherwise the driver app transmits positions to the tracking service, which uses Mapbox Map Matching for smoothing. The notification service uses SMS or email providers to inform customers of ETAs and deliveries.

### Shopify Integration
The merchant installs a private Shopify app or Checkout UI extension to let customers choose a delivery or pick-up date. When orders are marked delivered, the order management service calls the Shopify Fulfilment API to update status. Embedded map widgets in the storefront can show pickup locations or track orders using Mapbox maps.

These services communicate via REST or message queues and authenticate using your API gateway. Each service is deployed as a container (e.g., Docker) and scales independently.

## Implementation Roadmap

### 1. Infrastructure and Keys

- Set up PostgreSQL/PostGIS and create schemas for orders, vehicles, routes, drivers and settings.
- Create a Mapbox account and generate API tokens for the Directions, Matrix, Optimisation, Isochrone and Map Matching APIs. Store tokens securely (e.g., environment variables or secrets manager) and implement usage logging to monitor consumption of the free tier.

### 2. Core Services Development

- **Geocoding service**: integrate Pelias; implement fallback logic to call Mapbox's geocoding API if Pelias fails.
- **Routing service**: implement endpoints to call the Mapbox Directions API with appropriate profiles and waypoints. Parse the response to extract route geometry, duration, distance and instructions.
- **Optimisation service**: define a job schema and build logic to translate orders and vehicles into the Mapbox Optimisation API request format. Handle asynchronous responses by polling or using webhooks. Store optimised routes and handle errors.
- **Matrix service**: implement endpoints that call the Mapbox Matrix API for relevant sets of coordinates, caching results to reduce calls.
- **Isochrone service**: develop endpoints to request isochrones for warehouses or driver starting points and to group orders by zone.
- **Tracking service**: integrate optional Traccar or implement direct device tracking; call the Map Matching API to snap GPS traces and store cleaned tracks.

### 3. User Interfaces

- **Admin dashboard**: build a web UI with Mapbox GL JS to display orders, routes, zones and vehicles. Provide controls to create runs, assign drivers and monitor deliveries. Use Mapbox Studio to design custom map styles.
- **Driver app**: develop a mobile app that lists assigned stops, shows a route map with turn-by-turn navigation (via Mapbox Navigation SDK), and allows drivers to report progress. The app should sync with the server and send location updates.
- **Customer app/Shopify widgets**: build components that allow customers to select delivery dates during checkout and to track orders. Use Mapbox GL JS for interactive maps on the storefront.

### 4. Integration and Workflow

1. Orders come in from Shopify and are stored in PostGIS with delivery windows. The geocoding service converts addresses to coordinates and stores them.
2. At scheduled intervals or on demand, the optimisation service retrieves unassigned orders, vehicles and zones. It submits a request to the [Mapbox Optimisation API](https://docs.mapbox.com/api/navigation/optimization/) or, if conditions require, falls back to VROOM. When a solution is returned, it stores the route plan.
3. The routing service generates route geometries via the [Directions API](https://docs.mapbox.com/api/navigation/directions/) and persists them. The matrix service may be used for additional calculations.
4. The admin dashboard displays routes and orders; staff can make adjustments and confirm assignments.
5. The driver app downloads its assigned route and uses Mapbox navigation. Location updates feed into the tracking service, which may call [Map Matching](https://docs.mapbox.com/api/navigation/map-matching/) for smoothing. Notifications are sent to customers based on ETA updates.
6. After completing deliveries, the order management service updates Shopify via the Fulfilment API and marks orders as delivered.

### 5. Monitoring and Scaling

- Track Mapbox API usage per service and compare against [free tier thresholds](https://www.softkraft.co/mapbox-vs-google-maps/). Implement alerts to prevent unexpected costs.
- Use container orchestration (e.g., Docker Compose, Kubernetes) to deploy services and scale them independently. Apply caching strategies for API responses.
- Maintain logs and metrics for performance and debugging.

## Future Enhancements

- **EV routing and advanced traffic**: leverage Mapbox EV profiles and dynamic traffic data to improve ETA accuracy.
- **Automated zone assignment**: integrate Isochrone and Matrix services to generate daily runs based on dynamic demand and driver availability.
- **AI and analytics**: use machine learning to predict order volumes, optimise driver schedules and reduce costs.

## Key Considerations

### Cost Management
Even with generous free tiers, Mapbox APIs become billable beyond 100k monthly requests/elements for most services. Monitor consumption closely and implement caching and batching to reduce calls.

### Service Limits
The [Optimisation API v2](https://docs.mapbox.com/api/navigation/optimization/) is still in beta and may have limits on problem size and features. Maintain VROOM as a fallback for large or complex problems.

### Data Privacy
Ensure compliance with privacy laws when handling user addresses and location data. Store tokens securely and avoid exposing them in client-side code.

### Vendor Reliance
By integrating Mapbox, you reduce self-hosting complexity but rely on an external provider. Preserve open-source alternatives (OSRM, VROOM, MapLibre) as backups to maintain continuity if costs rise or service changes occur.

### Customisation
Leverage Mapbox Studio's powerful design tools to create branded maps, but maintain a consistent style across web, mobile and shop-front applications.

---

# Documentation Checklist and Deliverables

## Documentation Checklist for SaaS Routing Platform with Mapbox Integration

This document outlines the documentation that should accompany development of the routing system MVP. It covers environment setup, service APIs, security practices, deployment instructions and user guides. Use it as a checklist to ensure all necessary documents are produced.

## Setup & Environment

### System Prerequisites
Document supported operating systems, programming languages (Node.js/TypeScript or Python, etc.), required packages and minimum hardware specifications.

### Database and Spatial Extensions
Provide installation and configuration instructions for PostgreSQL and the PostGIS extension.

### Mapbox Account Setup
Detail how to create a Mapbox account, generate API tokens for the Directions, Optimisation, Matrix, Map Matching and Isochrone APIs, and store them securely (environment variables or secrets manager). Mention the generous free tiers and [pay-as-you-go pricing](https://www.softkraft.co/mapbox-vs-google-maps/).

### Pelias (Optional) Installation
If Pelias is retained for geocoding, document how to download OpenStreetMap and other datasets, import them, and configure the Pelias API.

### Project Repository Setup
Instructions for cloning the repository, installing dependencies, running migrations and starting services locally.

## Service Documentation

Each microservice should have its own README or API specification:

### Geocoding Service
Describe endpoints for forward and reverse geocoding. Explain how the service calls Pelias by default and falls back to Mapbox geocoding when necessary.

### Routing Service
Detail the API interface for requesting point-to-point routes. Document supported Mapbox routing profiles (driving, driving-traffic, walking, cycling) and parameters such as waypoints and [annotations](https://docs.mapbox.com/api/navigation/directions/).

### Optimisation Service
Explain how to submit vehicle routing problems to the [Mapbox Optimisation API v2](https://docs.mapbox.com/api/navigation/optimization/), including the JSON schema for vehicles, services, shipments and constraints. Describe the process for polling results and error handling.

### Matrix Service
Document how to request travel time/distance matrices from the [Mapbox Matrix API](https://docs.mapbox.com/api/navigation/matrix/), including optional parameters for sources/destinations.

### Isochrone and Zone Service
Provide instructions for calling the [Isochrone API](https://docs.mapbox.com/api/navigation/isochrone/) to compute reachable areas and how to convert results into delivery zones.

### Tracking Service
Specify how the service processes GPS pings from the driver app or Traccar, calls the [Map Matching API](https://docs.mapbox.com/api/navigation/map-matching/) for trace cleaning and stores the data. Document how to emit customer notifications when vehicles approach.

### Order Management Service
Describe how orders are ingested (e.g., via Shopify webhooks), stored, updated and how fulfilment updates are sent back to Shopify.

### Dashboard UI and Map
Explain the front-end architecture, use of Mapbox GL JS, custom map styles and how routes/zones are visualised.

### Driver App
Provide guidelines for installing and using the app, including authentication, viewing route details, capturing proof of delivery and sending location updates.

## API & Data Models

- Define the data models for orders, vehicles, drivers, routes and zones (including field names and types).
- For each service, document request and response payloads. Provide sample JSON requests and responses.
- Include diagrams or schemas illustrating how services interact (sequence diagrams, entity-relationship diagrams).

## Security & Authentication

- Describe how Mapbox tokens are stored (e.g., environment variables, secure secrets storage) and rotated periodically.
- Document authentication and authorisation for internal APIs (JWTs, OAuth, API keys).
- Outline CORS policies, rate limiting and input validation to mitigate common web vulnerabilities.
- Note any compliance requirements (e.g., GDPR) when processing customer addresses and location data.

## Testing & Staging

- Provide instructions for setting up a local development environment using test Mapbox tokens.
- Describe unit tests and integration tests for each service, including mocking Mapbox API calls.
- Include guidance on generating test datasets (orders, vehicles, zones) and scenarios (e.g., missed deliveries, partial failures).
- Offer strategies for load testing and monitoring Mapbox usage to avoid exceeding free tiers.

## Deployment & Operations

- Explain how to containerise each service using Docker and orchestrate them (e.g., Docker Compose or Kubernetes).
- Document environment-specific configuration (development, staging, production).
- Provide instructions for CI/CD pipelines, including automated testing and deployment.
- Describe logging, monitoring and alerting (e.g., using Prometheus/Grafana) to track performance and Mapbox API consumption.
- Outline backup and disaster recovery procedures for the database and configuration.

## User & Admin Guides

### Administrator Guide
Step-by-step instructions for managing orders, creating runs, assigning drivers, viewing maps and editing zones. Include screenshots of the dashboard.

### Driver Guide
Instructions on installing the mobile app, logging in, following routes using Mapbox navigation, updating delivery status and reporting issues.

### Customer Guide
Explain how to choose delivery dates in Shopify, track orders via map widgets, and receive notifications.

## Future Enhancements & Maintenance

- Document plans for features not in the initial MVP (e.g., EV-specific routing, predictive demand, automated payroll).
- Outline a maintenance plan for updating dependencies, regenerating map styles and renewing Mapbox tokens.

## Documentation Checklist

- [ ] System prerequisites and environment setup documented
- [ ] PostGIS and database schema documentation complete
- [ ] Mapbox account setup instructions with token management
- [ ] Pelias setup instructions (if applicable)
- [ ] Geocoding service API spec written
- [ ] Routing service API spec written ([Mapbox Directions API usage](https://docs.mapbox.com/api/navigation/directions/))
- [ ] Optimisation service API spec written ([Mapbox Optimisation API usage](https://docs.mapbox.com/api/navigation/optimization/))
- [ ] Matrix service API spec written ([Mapbox Matrix API usage](https://docs.mapbox.com/api/navigation/matrix/))
- [ ] Isochrone/zone service API spec written ([Isochrone API](https://docs.mapbox.com/api/navigation/isochrone/))
- [ ] Tracking service API spec written ([Map Matching API usage](https://docs.mapbox.com/api/navigation/map-matching/))
- [ ] Order management service documentation complete (Shopify integration and fulfilment updates)
- [ ] Dashboard UI documentation complete (Mapbox GL JS usage and map styles)
- [ ] Driver mobile app documentation complete
- [ ] Data models and API payload definitions drafted
- [ ] Security and authentication guidelines documented
- [ ] Testing and staging instructions drafted
- [ ] Deployment and operations documentation drafted
- [ ] Administrator user guide written
- [ ] Driver guide written
- [ ] Customer guide written
- [ ] Maintenance and future enhancements documented
