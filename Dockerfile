FROM node:22-alpine AS web-build

WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS server-build

WORKDIR /src/server
COPY server/*.csproj ./
RUN dotnet restore

COPY server/ ./
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app
ENV ASPNETCORE_URLS=http://+:5080
EXPOSE 5080

COPY --from=server-build /app/publish ./
COPY --from=web-build /src/web/dist ./wwwroot

ENTRYPOINT ["dotnet", "QrDrop.Server.dll"]
