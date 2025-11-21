import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '@config/logger';

interface Client {
  id: string;
  response: Response;
}

export class RealtimeService {
  private orderSubscribers: Map<string, Client[]> = new Map();
  private runSubscribers: Map<string, Client[]> = new Map();
  private driverSubscribers: Map<string, Client[]> = new Map();

  /**
   * Add a subscriber to order updates
   */
  addOrderSubscriber(orderId: string, res: Response): string {
    const clientId = uuidv4();
    const client: Client = { id: clientId, response: res };

    if (!this.orderSubscribers.has(orderId)) {
      this.orderSubscribers.set(orderId, []);
    }

    this.orderSubscribers.get(orderId)!.push(client);
    logger.debug('Added order subscriber', { orderId, clientId, total: this.orderSubscribers.get(orderId)!.length });

    return clientId;
  }

  /**
   * Remove a subscriber from order updates
   */
  removeOrderSubscriber(orderId: string, clientId: string): void {
    const subscribers = this.orderSubscribers.get(orderId);
    if (!subscribers) return;

    const filtered = subscribers.filter((client) => client.id !== clientId);

    if (filtered.length === 0) {
      this.orderSubscribers.delete(orderId);
    } else {
      this.orderSubscribers.set(orderId, filtered);
    }

    logger.debug('Removed order subscriber', { orderId, clientId, remaining: filtered.length });
  }

  /**
   * Broadcast update to all subscribers of an order
   */
  broadcastOrderUpdate(orderId: string, data: unknown): void {
    const subscribers = this.orderSubscribers.get(orderId);
    if (!subscribers || subscribers.length === 0) return;

    const message = `data: ${JSON.stringify({ type: 'order_update', orderId, data })}\n\n`;

    subscribers.forEach((client) => {
      try {
        client.response.write(message);
      } catch (error) {
        logger.error('Failed to send order update', { orderId, clientId: client.id, error });
        this.removeOrderSubscriber(orderId, client.id);
      }
    });

    logger.debug('Broadcasted order update', { orderId, subscribers: subscribers.length });
  }

  /**
   * Add a subscriber to run updates
   */
  addRunSubscriber(runId: string, res: Response): string {
    const clientId = uuidv4();
    const client: Client = { id: clientId, response: res };

    if (!this.runSubscribers.has(runId)) {
      this.runSubscribers.set(runId, []);
    }

    this.runSubscribers.get(runId)!.push(client);
    logger.debug('Added run subscriber', { runId, clientId, total: this.runSubscribers.get(runId)!.length });

    return clientId;
  }

  /**
   * Remove a subscriber from run updates
   */
  removeRunSubscriber(runId: string, clientId: string): void {
    const subscribers = this.runSubscribers.get(runId);
    if (!subscribers) return;

    const filtered = subscribers.filter((client) => client.id !== clientId);

    if (filtered.length === 0) {
      this.runSubscribers.delete(runId);
    } else {
      this.runSubscribers.set(runId, filtered);
    }

    logger.debug('Removed run subscriber', { runId, clientId, remaining: filtered.length });
  }

  /**
   * Broadcast update to all subscribers of a run
   */
  broadcastRunUpdate(runId: string, data: unknown): void {
    const subscribers = this.runSubscribers.get(runId);
    if (!subscribers || subscribers.length === 0) return;

    const message = `data: ${JSON.stringify({ type: 'run_update', runId, data })}\n\n`;

    subscribers.forEach((client) => {
      try {
        client.response.write(message);
      } catch (error) {
        logger.error('Failed to send run update', { runId, clientId: client.id, error });
        this.removeRunSubscriber(runId, client.id);
      }
    });

    logger.debug('Broadcasted run update', { runId, subscribers: subscribers.length });
  }

  /**
   * Add a subscriber to driver location updates
   */
  addDriverSubscriber(driverId: string, res: Response): string {
    const clientId = uuidv4();
    const client: Client = { id: clientId, response: res };

    if (!this.driverSubscribers.has(driverId)) {
      this.driverSubscribers.set(driverId, []);
    }

    this.driverSubscribers.get(driverId)!.push(client);
    logger.debug('Added driver subscriber', { driverId, clientId, total: this.driverSubscribers.get(driverId)!.length });

    return clientId;
  }

  /**
   * Remove a subscriber from driver location updates
   */
  removeDriverSubscriber(driverId: string, clientId: string): void {
    const subscribers = this.driverSubscribers.get(driverId);
    if (!subscribers) return;

    const filtered = subscribers.filter((client) => client.id !== clientId);

    if (filtered.length === 0) {
      this.driverSubscribers.delete(driverId);
    } else {
      this.driverSubscribers.set(driverId, filtered);
    }

    logger.debug('Removed driver subscriber', { driverId, clientId, remaining: filtered.length });
  }

  /**
   * Broadcast location update to all subscribers of a driver
   */
  broadcastDriverLocation(driverId: string, location: { latitude: number; longitude: number; heading?: number; speed?: number }): void {
    const subscribers = this.driverSubscribers.get(driverId);
    if (!subscribers || subscribers.length === 0) return;

    const message = `data: ${JSON.stringify({ type: 'driver_location', driverId, location, timestamp: new Date().toISOString() })}\n\n`;

    subscribers.forEach((client) => {
      try {
        client.response.write(message);
      } catch (error) {
        logger.error('Failed to send driver location', { driverId, clientId: client.id, error });
        this.removeDriverSubscriber(driverId, client.id);
      }
    });

    logger.debug('Broadcasted driver location', { driverId, subscribers: subscribers.length });
  }

  /**
   * Get subscriber counts (for monitoring)
   */
  getSubscriberCounts() {
    return {
      orders: this.orderSubscribers.size,
      runs: this.runSubscribers.size,
      drivers: this.driverSubscribers.size,
      totalClients:
        Array.from(this.orderSubscribers.values()).reduce((sum, clients) => sum + clients.length, 0) +
        Array.from(this.runSubscribers.values()).reduce((sum, clients) => sum + clients.length, 0) +
        Array.from(this.driverSubscribers.values()).reduce((sum, clients) => sum + clients.length, 0),
    };
  }
}

export const realtimeService = new RealtimeService();
