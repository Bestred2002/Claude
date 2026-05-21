import SwiftUI

@main
struct myTVWatchApp: App {
    @StateObject private var store = PlayerStore.shared
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
