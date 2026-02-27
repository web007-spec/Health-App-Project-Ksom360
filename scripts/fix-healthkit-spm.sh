#!/bin/bash
# Post-install script to add Package.swift to HealthKit plugin for Capacitor 8 SPM compatibility
PLUGIN_DIR="node_modules/@johnjasonhudson/capacitor-healthkit"

if [ -d "$PLUGIN_DIR" ] && [ ! -f "$PLUGIN_DIR/Package.swift" ]; then
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
        .target(
            name: "JohnjasonhudsonCapacitorHealthkitPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Plugin",
            sources: [
                "CapacitorHealthkitPlugin.swift",
                "CapacitorHealthkitPlugin.m"
            ],
            publicHeadersPath: ".",
            linkerSettings: [
                .linkedFramework("HealthKit")
            ]
        )
    ]
)
EOF
  echo "✅ Created Package.swift for @johnjasonhudson/capacitor-healthkit"
fi
