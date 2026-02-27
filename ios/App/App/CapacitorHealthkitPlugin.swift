import Foundation
import Capacitor
import HealthKit

/// Minimal HealthKit plugin for Capacitor 8.
/// Supports: requestAuthorization, queryHKitSampleType, isAvailable.
@objc(CapacitorHealthkitPlugin)
public class CapacitorHealthkitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CapacitorHealthkitPlugin"
    public let jsName = "CapacitorHealthkit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryHKitSampleType", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    // MARK: - Sample name → HK type mapping

    private func quantityType(for name: String) -> HKQuantityType? {
        switch name {
        case "stepCount":
            return HKQuantityType.quantityType(forIdentifier: .stepCount)
        case "heartRate":
            return HKQuantityType.quantityType(forIdentifier: .heartRate)
        case "restingHeartRate":
            return HKQuantityType.quantityType(forIdentifier: .restingHeartRate)
        case "activeEnergyBurned":
            return HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)
        case "basalEnergyBurned":
            return HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned)
        case "distanceWalkingRunning":
            return HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)
        case "appleExerciseTime":
            return HKQuantityType.quantityType(forIdentifier: .appleExerciseTime)
        case "flightsClimbed":
            return HKQuantityType.quantityType(forIdentifier: .flightsClimbed)
        case "bodyMass", "weight":
            return HKQuantityType.quantityType(forIdentifier: .bodyMass)
        case "bloodGlucose":
            return HKQuantityType.quantityType(forIdentifier: .bloodGlucose)
        case "oxygenSaturation":
            return HKQuantityType.quantityType(forIdentifier: .oxygenSaturation)
        case "respiratoryRate":
            return HKQuantityType.quantityType(forIdentifier: .respiratoryRate)
        case "bodyFatPercentage", "bodyFat":
            return HKQuantityType.quantityType(forIdentifier: .bodyFatPercentage)
        case "bloodPressureSystolic":
            return HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic)
        case "bloodPressureDiastolic":
            return HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic)
        case "bodyTemperature":
            return HKQuantityType.quantityType(forIdentifier: .bodyTemperature)
        case "basalBodyTemperature":
            return HKQuantityType.quantityType(forIdentifier: .basalBodyTemperature)
        default:
            return nil
        }
    }

    private func categoryType(for name: String) -> HKCategoryType? {
        switch name {
        case "sleepAnalysis":
            return HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)
        default:
            return nil
        }
    }

    private func sampleType(for name: String) -> HKSampleType? {
        if name == "workoutType" {
            return HKWorkoutType.workoutType()
        }
        return quantityType(for: name) ?? categoryType(for: name)
    }

    /// Unit to use when reading quantity samples.
    private func unit(for name: String) -> HKUnit {
        switch name {
        case "heartRate", "restingHeartRate":
            return HKUnit.count().unitDivided(by: .minute())
        case "stepCount", "flightsClimbed":
            return .count()
        case "activeEnergyBurned", "basalEnergyBurned":
            return .kilocalorie()
        case "distanceWalkingRunning", "distanceCycling":
            return .meter()
        case "appleExerciseTime":
            return .minute()
        case "bodyMass", "weight":
            return .gramUnit(with: .kilo)
        case "bloodGlucose":
            return HKUnit.moleUnit(with: .milli, molarMass: HKUnitMolarMassBloodGlucose).unitDivided(by: .liter())
        case "oxygenSaturation", "bodyFatPercentage", "bodyFat":
            return .percent()
        case "respiratoryRate":
            return HKUnit.count().unitDivided(by: .minute())
        case "bloodPressureSystolic", "bloodPressureDiastolic":
            return .millimeterOfMercury()
        case "bodyTemperature", "basalBodyTemperature":
            return .degreeCelsius()
        default:
            return .count()
        }
    }

    // MARK: - Plugin Methods

    @objc func isAvailable(_ call: CAPPluginCall) {
        if HKHealthStore.isHealthDataAvailable() {
            call.resolve()
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false])
            return
        }

        let readNames = (call.options?["read"] as? [String]) ?? []
        let writeNames = (call.options?["write"] as? [String]) ?? []
        let allNames = (call.options?["all"] as? [String]) ?? []

        var readTypes = Set<HKSampleType>()
        var writeTypes = Set<HKSampleType>()

        for name in readNames + allNames {
            if let t = sampleType(for: name) { readTypes.insert(t) }
        }
        for name in writeNames + allNames {
            if let t = sampleType(for: name) { writeTypes.insert(t) }
        }

        healthStore.requestAuthorization(toShare: writeTypes, read: readTypes) { success, error in
            if let error = error {
                call.resolve(["granted": false, "error": error.localizedDescription])
            } else {
                call.resolve(["granted": success])
            }
        }
    }

    @objc func queryHKitSampleType(_ call: CAPPluginCall) {
        guard let sampleName = call.options?["sampleName"] as? String else {
            call.resolve(["countReturn": 0, "resultData": []])
            return
        }
        guard let startDateStr = call.options?["startDate"] as? String,
              let endDateStr   = call.options?["endDate"] as? String else {
            call.resolve(["countReturn": 0, "resultData": []])
            return
        }

        let limit = (call.options?["limit"] as? Int) ?? 1000

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fallback = ISO8601DateFormatter()

        guard let startDate = formatter.date(from: startDateStr) ?? fallback.date(from: startDateStr),
              let endDate   = formatter.date(from: endDateStr) ?? fallback.date(from: endDateStr) else {
            call.resolve(["countReturn": 0, "resultData": []])
            return
        }

        // Workouts
        if sampleName == "workoutType" {
            queryWorkouts(call: call, start: startDate, end: endDate, limit: limit)
            return
        }

        // Sleep
        if sampleName == "sleepAnalysis" {
            querySleep(call: call, start: startDate, end: endDate, limit: limit)
            return
        }

        // Quantity types (heart rate, steps, calories, etc.)
        guard let qType = quantityType(for: sampleName) else {
            call.resolve(["countReturn": 0, "resultData": []])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDesc  = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(sampleType: qType,
                                  predicate: predicate,
                                  limit: limit,
                                  sortDescriptors: [sortDesc]) { [weak self] _, samples, error in
            guard let self = self else { return }
            if let error = error {
                call.resolve(["countReturn": 0, "resultData": [], "error": error.localizedDescription])
                return
            }

            let hkUnit = self.unit(for: sampleName)
            var results: [[String: Any]] = []

            for sample in (samples as? [HKQuantitySample]) ?? [] {
                let value = sample.quantity.doubleValue(for: hkUnit)
                var item: [String: Any] = [
                    "value": value,
                    "unitName": hkUnit.unitString,
                    "startDate": self.iso(sample.startDate),
                    "endDate": self.iso(sample.endDate),
                    "duration": sample.endDate.timeIntervalSince(sample.startDate),
                    "uuid": sample.uuid.uuidString,
                    "source": sample.sourceRevision.source.name,
                    "sourceBundleId": sample.sourceRevision.source.bundleIdentifier,
                ]
                if let device = sample.device {
                    item["device"] = self.deviceInfo(device)
                }
                results.append(item)
            }

            call.resolve([
                "countReturn": results.count,
                "resultData": results
            ])
        }

        healthStore.execute(query)
    }

    // MARK: - Workout query

    private func queryWorkouts(call: CAPPluginCall, start: Date, end: Date, limit: Int) {
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sortDesc  = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(sampleType: HKWorkoutType.workoutType(),
                                  predicate: predicate,
                                  limit: limit,
                                  sortDescriptors: [sortDesc]) { [weak self] _, samples, error in
            guard let self = self else { return }
            var results: [[String: Any]] = []

            for workout in (samples as? [HKWorkout]) ?? [] {
                var item: [String: Any] = [
                    "startDate": self.iso(workout.startDate),
                    "endDate": self.iso(workout.endDate),
                    "duration": workout.duration,
                    "uuid": workout.uuid.uuidString,
                    "source": workout.sourceRevision.source.name,
                    "sourceBundleId": workout.sourceRevision.source.bundleIdentifier,
                    "workoutActivityId": workout.workoutActivityType.rawValue,
                    "workoutActivityName": String(describing: workout.workoutActivityType),
                    "totalEnergyBurned": workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0,
                    "totalDistance": workout.totalDistance?.doubleValue(for: .meter()) ?? 0,
                    "totalFlightsClimbed": workout.totalFlightsClimbed?.doubleValue(for: .count()) ?? 0,
                    "totalSwimmingStrokeCount": workout.totalSwimmingStrokeCount?.doubleValue(for: .count()) ?? 0,
                ]
                if let device = workout.device {
                    item["device"] = self.deviceInfo(device)
                }
                results.append(item)
            }

            call.resolve([
                "countReturn": results.count,
                "resultData": results
            ])
        }

        healthStore.execute(query)
    }

    // MARK: - Sleep query

    private func querySleep(call: CAPPluginCall, start: Date, end: Date, limit: Int) {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.resolve(["countReturn": 0, "resultData": []])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sortDesc  = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(sampleType: sleepType,
                                  predicate: predicate,
                                  limit: limit,
                                  sortDescriptors: [sortDesc]) { [weak self] _, samples, _ in
            guard let self = self else { return }
            var results: [[String: Any]] = []

            for sample in (samples as? [HKCategorySample]) ?? [] {
                var sleepState = "unknown"
                if #available(iOS 16.0, *) {
                    switch HKCategoryValueSleepAnalysis(rawValue: sample.value) {
                    case .awake: sleepState = "awake"
                    case .asleepCore: sleepState = "asleepCore"
                    case .asleepDeep: sleepState = "asleepDeep"
                    case .asleepREM: sleepState = "asleepREM"
                    case .inBed: sleepState = "inBed"
                    default: sleepState = "unknown"
                    }
                } else {
                    switch HKCategoryValueSleepAnalysis(rawValue: sample.value) {
                    case .inBed: sleepState = "inBed"
                    case .asleep: sleepState = "asleep"
                    case .awake: sleepState = "awake"
                    default: sleepState = "unknown"
                    }
                }

                var item: [String: Any] = [
                    "startDate": self.iso(sample.startDate),
                    "endDate": self.iso(sample.endDate),
                    "sleepState": sleepState,
                    "duration": sample.endDate.timeIntervalSince(sample.startDate),
                    "uuid": sample.uuid.uuidString,
                    "source": sample.sourceRevision.source.name,
                    "sourceBundleId": sample.sourceRevision.source.bundleIdentifier,
                ]
                if let device = sample.device {
                    item["device"] = self.deviceInfo(device)
                }
                results.append(item)
            }

            call.resolve([
                "countReturn": results.count,
                "resultData": results
            ])
        }

        healthStore.execute(query)
    }

    // MARK: - Helpers

    private func iso(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: date)
    }

    private func deviceInfo(_ device: HKDevice) -> [String: Any] {
        return [
            "name": device.name ?? "",
            "manufacturer": device.manufacturer ?? "",
            "model": device.model ?? "",
            "hardwareVersion": device.hardwareVersion ?? "",
            "softwareVersion": device.softwareVersion ?? "",
        ]
    }
}
