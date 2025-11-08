import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/register`, async () => {
    return HttpResponse.json({ access_token: 'test-token', token_type: 'bearer' }, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/auth/login`, async () => {
    return HttpResponse.json({ access_token: 'test-token', token_type: 'bearer' }, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/auth/logout`, async () => {
    return HttpResponse.json({}, { status: 204 });
  }),

  http.get(`${API_BASE_URL}/auth/me`, async () => {
    return HttpResponse.json(
      {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      },
      { status: 200 }
    );
  }),

  // Groups endpoints
  http.get(`${API_BASE_URL}/groups`, async () => {
    return HttpResponse.json(
      {
        items: [
          {
            id: 'group-1',
            name: 'Test Group',
            description: 'A test group',
            members_count: 5,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE_URL}/groups`, async () => {
    return HttpResponse.json(
      {
        id: 'new-group-id',
        name: 'New Group',
        description: 'A new group',
        created_at: '2024-01-01T00:00:00Z',
      },
      { status: 201 }
    );
  }),

  http.get(`${API_BASE_URL}/groups/:id`, async () => {
    return HttpResponse.json(
      {
        id: 'group-1',
        name: 'Test Group',
        description: 'A test group',
        members_count: 5,
        created_at: '2024-01-01T00:00:00Z',
      },
      { status: 200 }
    );
  }),

  // Draws endpoints
  http.get(`${API_BASE_URL}/groups/:id/draws`, async () => {
    return HttpResponse.json(
      {
        items: [
          {
            id: 'draw-1',
            name: 'Christmas 2024',
            status: 'created',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE_URL}/groups/:id/draws`, async () => {
    return HttpResponse.json(
      {
        id: 'new-draw-id',
        name: 'New Draw',
        status: 'created',
        created_at: '2024-01-01T00:00:00Z',
      },
      { status: 201 }
    );
  }),
];
