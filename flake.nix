{
  description = "Dimensions dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            pnpm
            yarn
          ];

          shellHook = ''
            echo "Dimensions dev shell"
            echo "- node:  $(node --version)"
            echo "- pnpm:  $(pnpm --version)"
            echo "- yarn:  $(yarn --version)"
          '';
        };
      });
}
