// src/app/services/inventory.service.ts
import { Injectable } from '@angular/core';
import { Apollo, gql, QueryRef } from 'apollo-angular';

export interface InventoryRow {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  product?: { id: string; name: string; sku: string } | null;
  warehouse?: { id: string; name: string; code: string } | null;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private apollo: Apollo) {}

  private Q_LIST = gql`
    query InventoryList {
      inventory(order_by: { product_id: asc }) {
        product_id
        warehouse_id
        quantity
        product { id name sku }
        warehouse { id name code }
      }
    }
  `;

  private M_UPSERT = gql`
    mutation UpsertInventory($product_id: uuid!, $warehouse_id: uuid!, $quantity: numeric!) {
      insert_inventory_one(
        object: { product_id: $product_id, warehouse_id: $warehouse_id, quantity: $quantity }
        on_conflict: { constraint: inventory_pkey, update_columns: [quantity] }
      ) { product_id warehouse_id }
    }
  `;

  private M_UPDATE = gql`
    mutation UpdateInventory($product_id: uuid!, $warehouse_id: uuid!, $quantity: numeric!) {
      update_inventory_by_pk(
        pk_columns: { product_id: $product_id, warehouse_id: $warehouse_id }
        _set: { quantity: $quantity }
      ) { product_id warehouse_id }
    }
  `;

  private M_DELETE = gql`
    mutation DeleteInventory($product_id: uuid!, $warehouse_id: uuid!) {
      delete_inventory_by_pk(product_id: $product_id, warehouse_id: $warehouse_id) {
        product_id warehouse_id
      }
    }
  `;

  watchList(): QueryRef<{ inventory: InventoryRow[] }> {
    return this.apollo.watchQuery<{ inventory: InventoryRow[] }>({
      query: this.Q_LIST,
      fetchPolicy: 'cache-and-network',
    });
  }

  async refetchList(): Promise<void> {
    const w = this.apollo.client.watchQuery({ query: this.Q_LIST });
    await w.refetch();
  }

  upsert(product_id: string, warehouse_id: string, quantity: number) {
    return this.apollo.mutate({
      mutation: this.M_UPSERT,
      variables: { product_id, warehouse_id, quantity },
    });
  }

  update(product_id: string, warehouse_id: string, quantity: number) {
    return this.apollo.mutate({
      mutation: this.M_UPDATE,
      variables: { product_id, warehouse_id, quantity },
    });
  }

  delete(product_id: string, warehouse_id: string) {
    return this.apollo.mutate({
      mutation: this.M_DELETE,
      variables: { product_id, warehouse_id },
    });
  }
}
