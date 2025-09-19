import { Injectable } from '@angular/core';
import { Apollo, gql, QueryRef } from 'apollo-angular';
import { Observable } from 'rxjs';

export type Role = 'public' | 'operator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  // Nota: la API expone password_hash en DB; desde el front nunca lo leemos.
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private apollo: Apollo) {}

  private Q_LIST = gql`
    query UsersList {
      users(order_by: { created_at: desc }) {
        id
        email
        name
        role
        active
      }
    }
  `;

  private M_INSERT = gql`
    mutation InsertUser($obj: users_insert_input!) {
      insert_users_one(object: $obj) { id }
    }
  `;

  private M_UPDATE = gql`
    mutation UpdateUser($id: uuid!, $set: users_set_input!) {
      update_users_by_pk(pk_columns: { id: $id }, _set: $set) { id }
    }
  `;

  private M_DELETE = gql`
    mutation DeleteUser($id: uuid!) {
      delete_users_by_pk(id: $id) { id }
    }
  `;

  private M_DEACTIVATE = gql`
    mutation DeactivateUser($id: uuid!) {
      update_users_by_pk(pk_columns: { id: $id }, _set: { active: false }) { id }
    }
  `;

  private M_ACTIVATE = gql`
    mutation ActivateUser($id: uuid!) {
      update_users_by_pk(pk_columns: { id: $id }, _set: { active: true }) { id }
    }
  `;

  watchList(): QueryRef<{ users: User[] }> {
    return this.apollo.watchQuery<{ users: User[] }>({
      query: this.Q_LIST,
      fetchPolicy: 'cache-and-network',
    });
  }

  async refetchList(): Promise<void> {
    const w = this.apollo.client.watchQuery({ query: this.Q_LIST });
    await w.refetch();
  }

  // Crear: enviamos email, name, role, active y password_hash.
  // IMPORTANTE: idealmente el hash debe hacerse en el backend (trigger/acción).
  insert(params: { email: string; name: string; role: Role; active: boolean; password_hash: string }) {
    return this.apollo.mutate({ mutation: this.M_INSERT, variables: { obj: params } });
  }

  // Update: si NO se envía password_hash, no se toca.
  update(id: string, set: Partial<{ email: string; name: string; role: Role; active: boolean; password_hash: string }>) {
    return this.apollo.mutate({ mutation: this.M_UPDATE, variables: { id, set } });
  }

  activate(id: string)    { return this.apollo.mutate({ mutation: this.M_ACTIVATE,   variables: { id } }); }
  deactivate(id: string)  { return this.apollo.mutate({ mutation: this.M_DEACTIVATE, variables: { id } }); }
  delete(id: string)      { return this.apollo.mutate({ mutation: this.M_DELETE,     variables: { id } }); }
}
