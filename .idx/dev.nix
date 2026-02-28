{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.docker
    pkgs.docker-compose
  ];
  # Sets environment variables in the workspace
  env = {};
  # Fast way to run services in the workspace.
  # More info: https://devenv.sh/basics/
  services.postgres.enable = true;
  services.docker.enable = true;
  # Use `nix-shell` to get started.
}
