// src/app/services/products.service.ts
import { Injectable } from '@angular/core';
import { Apollo, gql, MutationResult, QueryRef } from 'apollo-angular';
import { map, Observable } from 'rxjs';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(private apollo: Apollo) {}

  private Q_LIST = gql`
    query ProductsList {
      products(order_by: { created_at: desc }) {
        id
        sku
        name
        description
        unit
        price
        active
      }
    }
  `;

  private M_INSERT = gql`
    mutation InsertProduct($obj: products_insert_input!) {
      insert_products_one(object: $obj) { id }
    }
  `;
  private M_UPDATE = gql`
    mutation UpdateProduct($id: uuid!, $set: products_set_input!) {
      update_products_by_pk(pk_columns: { id: $id }, _set: $set) { id }
    }
  `;
  private M_DEACTIVATE = gql`
    mutation DeactivateProduct($id: uuid!) {
      update_products_by_pk(pk_columns: { id: $id }, _set: { active: false }) { id }
    }
  `;
  private M_DELETE = gql`
    mutation DeleteProduct($id: uuid!) {
      delete_products_by_pk(id: $id) { id }
    }
  `;

  watchList(onlyActive = false): QueryRef<{ products: Product[] }> {
    return this.apollo.watchQuery<{ products: Product[] }>({
      query: this.Q_LIST,
      fetchPolicy: 'cache-and-network'
    });
  }

  async refetchList(): Promise<void> {
    const w = this.apollo.client.watchQuery({ query: this.Q_LIST });
    await w.refetch();
  }

  insert(obj: Partial<Product>) {
    return this.apollo.mutate({ mutation: this.M_INSERT, variables: { obj } });
  }
  update(id: string, set: Partial<Product>) {
    return this.apollo.mutate({ mutation: this.M_UPDATE, variables: { id, set } });
  }
  deactivate(id: string) {
    return this.apollo.mutate({ mutation: this.M_DEACTIVATE, variables: { id } });
  }
  delete(id: string) {
    return this.apollo.mutate({ mutation: this.M_DELETE, variables: { id } });
  }
}
