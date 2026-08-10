interface Repository {
  find(id: string): unknown;
}

export class InMemoryRepository implements Repository {
  find(id: string): unknown {
    return null;
  }
}
