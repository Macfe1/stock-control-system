import { Injectable } from '@angular/core';
import { Apollo, gql, QueryRef } from 'apollo-angular';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class WarehousesService {
  constructor(private apollo: Apollo) {}

  private Q_LIST = gql`
    query WarehousesList {
      warehouses(order_by: { created_at: desc }) {
        id
        code
        name
        address
        active
      }
    }
  `;

  private M_INSERT = gql`
    mutation InsertWarehouse($obj: warehouses_insert_input!) {
      insert_warehouses_one(object: $obj) { id }
    }
  `;

  private M_UPDATE = gql`
    mutation UpdateWarehouse($id: uuid!, $set: warehouses_set_input!) {
      update_warehouses_by_pk(pk_columns: { id: $id }, _set: $set) { id }
    }
  `;

  private M_DEACTIVATE = gql`
    mutation DeactivateWarehouse($id: uuid!) {
      update_warehouses_by_pk(pk_columns: { id: $id }, _set: { active: false }) { id }
    }
  `;

  private M_DELETE = gql`
    mutation DeleteWarehouse($id: uuid!) {
      delete_warehouses_by_pk(id: $id) { id }
    }
  `;

  watchList(onlyActive = false): QueryRef<{ warehouses: Warehouse[] }> {
    // Si luego quieres filtrar solo activas, cambia el query o usa variables
    return this.apollo.watchQuery<{ warehouses: Warehouse[] }>({
      query: this.Q_LIST,
      fetchPolicy: 'cache-and-network',
    });
  }

  async refetchList(): Promise<void> {
    // Refresca la query de lista manualmente (similar a ProductsService)
    const w = this.apollo.client.watchQuery({ query: this.Q_LIST });
    await w.refetch();
  }

  insert(obj: Partial<Warehouse>) {
    return this.apollo.mutate({ mutation: this.M_INSERT, variables: { obj } });
  }

  update(id: string, set: Partial<Warehouse>) {
    return this.apollo.mutate({ mutation: this.M_UPDATE, variables: { id, set } });
  }

  deactivate(id: string) {
    return this.apollo.mutate({ mutation: this.M_DEACTIVATE, variables: { id } });
  }

  delete(id: string) {
    return this.apollo.mutate({ mutation: this.M_DELETE, variables: { id } });
  }
}
