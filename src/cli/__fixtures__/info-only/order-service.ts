class ConcreteLogger {
  log(message: string): void {
    console.log(message);
  }
}

class OrderService {
  process(): void {
    const logger = new ConcreteLogger();
    logger.log('processing');
  }
}
