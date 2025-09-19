import { Injectable } from '@angular/core';
import { Apollo, gql, QueryRef } from 'apollo-angular';
import { Observable } from 'rxjs';

export type MovementType = 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT';

export interface Movement {
  id: string;
  created_at: string;
  user_id: string;
  product_id: string;
  warehouse_id: string | null;      

  type: MovementType;
  quantity: number;
  reason: string | null;
  active: boolean;

  user?: { id: string; name: string | null; email: string };
  product?: { id: string; name: string; sku: string };
  warehouse?: { id: string; name: string; code: string };
}

@Injectable({ providedIn: 'root' })
export class MovementsService {
  constructor(private apollo: Apollo) {}

  // === QUERIES/MUTATIONS ===

  private Q_LIST = gql`
    query MovementsList {
      stock_movements(order_by: { created_at: desc }) {
        id
        created_at
        user_id
        product_id
        warehouse_id
        type
        quantity
        reason
        active
        user { id name email }
        product { id name sku }
        warehouse { id name code }
      }
    }
  `;

  private M_INSERT = gql`
    mutation InsertMovement($obj: stock_movements_insert_input!) {
      insert_stock_movements_one(object: $obj) { id }
    }
  `;

  private M_UPDATE = gql`
    mutation UpdateMovement($id: uuid!, $set: stock_movements_set_input!) {
      update_stock_movements_by_pk(pk_columns: { id: $id }, _set: $set) { id }
    }
  `;

  private M_DEACTIVATE = gql`
    mutation DeactivateMovement($id: uuid!) {
      update_stock_movements_by_pk(pk_columns: { id: $id }, _set: { active: false }) { id }
    }
  `;

  private M_DELETE = gql`
    mutation DeleteMovement($id: uuid!) {
      delete_stock_movements_by_pk(id: $id) { id }
    }
  `;

  // === API ===

  watchList(): QueryRef<{ stock_movements: Movement[] }> {
    return this.apollo.watchQuery<{ stock_movements: Movement[] }>({
      query: this.Q_LIST,
      fetchPolicy: 'cache-and-network',
    });
  }

  insert(obj: Partial<Movement>) {
    return this.apollo.mutate({ mutation: this.M_INSERT, variables: { obj } });
  }

  update(id: string, set: Partial<Movement>) {
    return this.apollo.mutate({ mutation: this.M_UPDATE, variables: { id, set } });
  }

  deactivate(id: string) {
    return this.apollo.mutate({ mutation: this.M_DEACTIVATE, variables: { id } });
  }

  delete(id: string) {
    return this.apollo.mutate({ mutation: this.M_DELETE, variables: { id } });
  }
}
