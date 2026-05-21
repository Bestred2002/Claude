import SwiftUI

@main
struct myTVWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(PlayerStore.shared)
        }
    }
}
