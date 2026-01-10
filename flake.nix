{
  description = "Bun GraphQL server development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
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
        system,
        config,
        ...
      }: let
        overlay = final: prev: let
          bun = prev.bun;
        in {
          inherit bun;
        };
        pkgs = import inputs.nixpkgs {
          inherit system;
          overlays = [overlay];
        };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
          ];
        };

        treefmt = {
          projectRootFile = "flake.nix";
          programs.prettier.enable = true;
        };

        formatter = config.treefmt.build.wrapper;
      };
    };
}
