# init-json-server

This project is a simple JSON server setup using `@wll8/json-server` relative json-server. It provides a RESTful API for managing a collection of posts. The server is configured to handle CRUD operations and includes custom middleware for handling timestamps and pagination.

[Demo link](https://changeable-cyan-dumpling.glitch.me/api/v1/posts)

## Prerequisites

- Node.js > 12.x
- npm

## Installation

1. Clone the repository:

   ```bash
   git clone <https://github.com/vemines/init-json-server>
   cd init-json-server
   ```

2. Install the dependencies:

   ```bash
   npm install or npm i
   ```

## Scripts

- **Start the server**:

  ```bash
  npm start
  ```

  This will start the JSON server on `http://localhost:3000`.

- **Development mode**:

  ```bash
  npm run dev
  ```

  This will start the server with `nodemon` for automatic restarts on file changes.

- **Generate data**:

  ```bash
  npm run gen
  ```

  This will generate a new `db.json` file with fake data using `@faker-js/faker`.

## API Endpoints

- **GET /api/v1/posts**: Retrieve a list of posts.
- **POST /api/v1/posts**: Create a new post. Automatically adds `createdAt` and `updatedAt` timestamps.
- **PATCH /api/v1/posts/:id**: Update an existing post. Updates the `updatedAt` timestamp.
- **DELETE /api/v1/posts/:id**: Delete a post.

## Custom Features

- **Timestamps**: Automatically adds `createdAt` and `updatedAt` fields to posts on creation and update.
- **Pagination**: Supports pagination for GET requests with `_page` and `_limit` query parameters.

```json
"pagination": {
  "_page": 2,
  "_limit": 10,
  "_totalRows": 50
},
"links": {
  "first": "http://localhost:3000/api/v1/posts?_page=1",
  "prev": "http://localhost:3000/api/v1/posts?_page=1",
  "next": "http://localhost:3000/api/v1/posts?_page=3",
  "last": "http://localhost:3000/api/v1/posts?_page=5"
}
```

- **Note**:

1. for remove `/api/v1` prefix endpoint in `index.js` line 53 => `server.use(router);`
2. deloy on glitch add `"engines": { "node": "16.x" },` in `package.json`

## Configuration

- **Prettier**: The project uses Prettier for code formatting. Configuration can be found in `.prettierrc`.

## Author

VeMines.
Star🌟project it if you like it
