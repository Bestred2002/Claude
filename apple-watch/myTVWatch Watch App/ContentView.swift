import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: PlayerStore
    @State private var tab = 0

    var body: some View {
        NavigationStack {
            TabView(selection: $tab) {
                StationListView(stations: Catalog.radio, kind: .radio)
                    .tag(0)
                StationListView(stations: store.tvChannels, kind: .tv)
                    .tag(1)
            }
            .tabViewStyle(.page)
            .navigationTitle(tab == 0 ? "Radio" : "TV")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if store.currentName != nil {
                        NavigationLink(destination: NowPlayingView()) {
                            Image(systemName: "waveform")
                        }
                    }
                }
            }
        }
    }
}

struct StationListView: View {
    let stations: [Station]
    let kind: Station.Kind
    @EnvironmentObject var store: PlayerStore

    var body: some View {
        List(stations) { s in
            Button {
                store.play(s)
            } label: {
                HStack(spacing: 10) {
                    LogoView(station: s)
                        .frame(width: 36, height: 36)
                    VStack(alignment: .leading) {
                        Text(s.name).font(.headline)
                        if store.currentName == s.name {
                            Text("In riproduzione")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                        }
                    }
                    Spacer()
                    if !s.hasStream { Image(systemName: "exclamationmark.circle").foregroundStyle(.secondary) }
                }
            }
            .disabled(!s.hasStream)
        }
    }
}

struct LogoView: View {
    let station: Station
    var body: some View {
        if let url = URL(string: station.logoURL ?? "") {
            AsyncImage(url: url) { img in
                img.resizable().scaledToFit()
            } placeholder: {
                placeholder
            }
        } else {
            placeholder
        }
    }
    var placeholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6).fill(Color.gray.opacity(0.3))
            Text(String(station.name.prefix(2)).uppercased()).font(.caption2).bold()
        }
    }
}

struct NowPlayingView: View {
    @EnvironmentObject var store: PlayerStore
    var body: some View {
        VStack(spacing: 14) {
            Text(store.currentName ?? "—").font(.headline)
            HStack(spacing: 20) {
                Button { store.toggle() } label: {
                    Image(systemName: store.isPlaying ? "pause.fill" : "play.fill").font(.title2)
                }
                Button { store.stop() } label: {
                    Image(systemName: "stop.fill").font(.title2)
                }
            }
        }
        .navigationTitle("In onda")
    }
}
