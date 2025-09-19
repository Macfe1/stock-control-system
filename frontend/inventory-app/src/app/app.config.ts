import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';

const GRAPHQL_URI = 'http://localhost:8081/v1/graphql';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);

      const authLink = setContext((_, { headers }) => {
        // lee sesión desde localStorage (dev).
        const raw = localStorage.getItem('session');
        let extra: Record<string, string> = {};
        if (raw) {
          try {
            const user = JSON.parse(raw) as { id: string; role: string };
            if (user.role) extra['x-hasura-role'] = user.role;
            if (user.id) extra['x-hasura-user-id'] = user.id; // útil si usas reglas por usuario
          } catch {}
        }
        return {
          headers: {
            ...headers,
            ...extra
          }
        };
      });

      const link = ApolloLink.from([
        authLink,
        httpLink.create({ uri: 'http://localhost:8081/v1/graphql'})
      ]);

      return {
        link,
        cache: new InMemoryCache(),
        connectToDevTools: true
      };
    })
  ]
};