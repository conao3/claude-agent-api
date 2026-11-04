{
  description = "Bun GraphQL server development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    treefmt-nix.url = "github:numtide/treefmt-nix";
  };

  outputs = inputs @ {flake-parts, ...}:
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = ["x86_64-linux" "aarch64-darwin"];

      imports = [
        inputs.treefmt-nix.flakeModule
      ];

      perSystem = {
        pkgs,
        config,
        ...
      }: let
        python = pkgs.python315;
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.bun
            python
            pkgs.uv
          ];
        };

        treefmt = {
          projectRootFile = "flake.nix";
          programs.prettier.enable = true;
          programs.ruff.enable = true;
        };
      };
    };
}
