#!/bin/bash
# Post-install script to fix HealthKit plugin for Capacitor 8 SPM compatibility
# SPM does not support mixed Swift + ObjC in a single target, so we split them.
PLUGIN_DIR="node_modules/@johnjasonhudson/capacitor-healthkit"

if [ -d "$PLUGIN_DIR" ]; then
  # Move ObjC files to a separate directory if they're still in ios/Plugin
  mkdir -p "$PLUGIN_DIR/ios/PluginObjC"
  if [ -f "$PLUGIN_DIR/ios/Plugin/CapacitorHealthkitPlugin.m" ]; then
    mv "$PLUGIN_DIR/ios/Plugin/CapacitorHealthkitPlugin.m" "$PLUGIN_DIR/ios/PluginObjC/"
    echo "✅ Moved CapacitorHealthkitPlugin.m to PluginObjC"
  fi
  if [ -f "$PLUGIN_DIR/ios/Plugin/CapacitorHealthkitPlugin.h" ]; then
    mv "$PLUGIN_DIR/ios/Plugin/CapacitorHealthkitPlugin.h" "$PLUGIN_DIR/ios/PluginObjC/"
    echo "✅ Moved CapacitorHealthkitPlugin.h to PluginObjC"
  fi

  # Write the two-target Package.swift
  cat > "$PLUGIN_DIR/Package.swift" << 'EOF'
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "JohnjasonhudsonCapacitorHealthkit",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "JohnjasonhudsonCapacitorHealthkit",
            targets: ["JohnjasonhudsonCapacitorHealthkitPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.0.0")
    ],
    targets: [
        // Objective-C target for Capacitor plugin registration macros
        .target(
            name: "JohnjasonhudsonCapacitorHealthkitObjC",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/PluginObjC",
            publicHeadersPath: "."
        ),
        // Swift target for the main plugin implementation
        .target(
            name: "JohnjasonhudsonCapacitorHealthkitPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                "JohnjasonhudsonCapacitorHealthkitObjC"
            ],
            path: "ios/Plugin",
            exclude: [],
            linkerSettings: [
                .linkedFramework("HealthKit")
            ]
        )
    ]
)
EOF
  echo "✅ Created two-target Package.swift for @johnjasonhudson/capacitor-healthkit"
fi
