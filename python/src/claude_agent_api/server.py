from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from .schema import schema


def create_app() -> FastAPI:
    app = FastAPI(title="Claude Agent API - Python Proxy")
    graphql_app = GraphQLRouter(schema)
    app.include_router(graphql_app, prefix="/graphql")
    return app


app = create_app()


def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4001)


if __name__ == "__main__":
    main()
