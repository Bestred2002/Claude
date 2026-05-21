import Foundation

struct Station: Identifiable, Codable, Hashable {
    enum Kind: String, Codable { case tv, radio }
    let name: String
    let streamURL: String
    let logoURL: String?
    var id: String { name }
    var hasStream: Bool { !streamURL.isEmpty }
}

enum Catalog {

    // MARK: - Radio (lista curata, stream pubblici stabili)
    static let radio: [Station] = [
        .init(name: "RTL 102.5",       streamURL: "https://streamingv2.shoutcast.com/rtl-1025",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/RTL_102.5_-_Logo_2017.svg/200px-RTL_102.5_-_Logo_2017.svg.png"),
        .init(name: "Radio 105",       streamURL: "https://icecast.unitedradio.it/Radio105.mp3",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Radio_105_logo.svg/200px-Radio_105_logo.svg.png"),
        .init(name: "Radio Subasio",   streamURL: "https://icecast.unitedradio.it/Subasio.mp3",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Radio_Subasio_logo.svg/200px-Radio_Subasio_logo.svg.png"),
        .init(name: "Radio Subasio +", streamURL: "https://icecast.unitedradio.it/SubasioPiu.mp3",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Radio_Subasio_logo.svg/200px-Radio_Subasio_logo.svg.png"),
        .init(name: "RDS",             streamURL: "https://stream.rds.it/rds",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Rds_logo.svg/200px-Rds_logo.svg.png"),
        .init(name: "RDS Relax",       streamURL: "https://stream.rds.it/rdsrelax",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Rds_logo.svg/200px-Rds_logo.svg.png"),
        .init(name: "Radio Sportiva",  streamURL: "https://onair14.xdevel.com/proxy/radiosportiva?mp=/stream",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Radio_Sportiva_logo.svg/200px-Radio_Sportiva_logo.svg.png"),
        .init(name: "Radio 24",        streamURL: "https://ice24.indiocast.com/radio24",
              logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Radio_24_logo.svg/200px-Radio_24_logo.svg.png"),
    ]

    // MARK: - TV (fetch diretto da Free-TV/IPTV con merge iptv-org)
    static let freeTVPlaylistURL = URL(string: "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8")!
    static let iptvOrgItURL      = URL(string: "https://iptv-org.github.io/iptv/countries/it.m3u")!

    /// Scarica la lista TV italiana mergiando Free-TV (stream in chiaro, no DRM, no geo)
    /// con iptv-org (loghi e coda lunga di canali regionali). Free-TV vince per gli stream.
    static func fetchTVChannels() async -> [Station] {
        async let freeRaw = fetchPlaylist(url: freeTVPlaylistURL)
        async let iptvRaw = fetchPlaylist(url: iptvOrgItURL)
        let (free, iptv) = await (freeRaw, iptvRaw)
        // Free-TV multi-paese: tieni solo italiani
        let freeIt = free.filter { e in
            (e.country ?? "").uppercased() == "IT" ||
            (e.group ?? "").lowercased() == "italy" ||
            (e.group ?? "").lowercased() == "italia"
        }
        // Merge: chiave normalizzata, Free-TV sovrascrive lo stream
        var byKey: [String: PlaylistEntry] = [:]
        for e in iptv { byKey[normalize(e.name)] = e }
        for e in freeIt {
            let k = normalize(e.name)
            if var existing = byKey[k] {
                existing.streamURL = e.streamURL
                existing.logoURL = existing.logoURL ?? e.logoURL
                byKey[k] = existing
            } else {
                byKey[k] = e
            }
        }
        let stations = byKey.values.compactMap { e -> Station? in
            guard !e.streamURL.isEmpty else { return nil }
            return Station(name: cleanName(e.name), streamURL: e.streamURL, logoURL: e.logoURL)
        }
        // Ordine: prima i canali "popolari" italiani (Rai/Mediaset/Sky), poi alfabetico
        let priority = ["rai 1","rai 2","rai 3","rete 4","canale 5","italia 1","la7","tv8","nove","real time","dmax",
                        "rai news 24","sky tg24","tgcom 24","rai movie","rai premium","cine34","focus","iris",
                        "mediaset extra","20","27","top crime","cielo","la5","italia 2","boing","cartoonito","rtl 102.5 tv"]
        let lower = priority.enumerated().reduce(into: [String:Int]()) { $0[$1.element] = $1.offset }
        return stations.sorted { a, b in
            let ia = lower[a.name.lowercased()] ?? 999 + Int(a.name.lowercased().first?.asciiValue ?? 0)
            let ib = lower[b.name.lowercased()] ?? 999 + Int(b.name.lowercased().first?.asciiValue ?? 0)
            return ia < ib
        }
    }

    // MARK: - Helpers
    struct PlaylistEntry {
        var name: String
        var streamURL: String
        var logoURL: String?
        var country: String?
        var group: String?
    }

    private static func fetchPlaylist(url: URL) async -> [PlaylistEntry] {
        do {
            var req = URLRequest(url: url)
            req.cachePolicy = .reloadIgnoringLocalCacheData
            let (data, _) = try await URLSession.shared.data(for: req)
            guard let text = String(data: data, encoding: .utf8) else { return [] }
            return parseM3U(text)
        } catch { return [] }
    }

    static func parseM3U(_ text: String) -> [PlaylistEntry] {
        var out: [PlaylistEntry] = []
        var pending: PlaylistEntry? = nil
        for raw in text.split(separator: "\n", omittingEmptySubsequences: false) {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.hasPrefix("#EXTINF") {
                pending = PlaylistEntry(
                    name: extractTrailingName(line),
                    streamURL: "",
                    logoURL: extractAttr(line, key: "tvg-logo"),
                    country: extractAttr(line, key: "tvg-country"),
                    group: extractAttr(line, key: "group-title")
                )
            } else if !line.isEmpty && !line.hasPrefix("#") {
                if var p = pending {
                    p.streamURL = line
                    out.append(p)
                    pending = nil
                }
            }
        }
        return out
    }

    static func extractAttr(_ line: String, key: String) -> String? {
        guard let r = line.range(of: "\(key)=\"") else { return nil }
        let after = line[r.upperBound...]
        guard let end = after.firstIndex(of: "\"") else { return nil }
        return String(after[..<end])
    }

    static func extractTrailingName(_ line: String) -> String {
        if let c = line.lastIndex(of: ",") {
            return String(line[line.index(after: c)...]).trimmingCharacters(in: .whitespaces)
        }
        return "Canale"
    }

    static func normalize(_ s: String) -> String {
        var r = s.lowercased()
        // rimuovi simboli enclosed unicode (Ⓖ, Ⓢ, ecc.)
        r = String(r.unicodeScalars.filter { !(0x2460...0x24FF ~= $0.value) })
        let patterns = [
            #"\(\s*\d{2,4}p\s*\)"#,
            #"\[(geo[\s-]?blocked|not\s*24/7|geo\s*-?\s*blocked)\]"#,
            #"\s+hd\b"#, #"\s+sd\b"#, #"\s+4k\b"#
        ]
        for p in patterns {
            r = r.replacingOccurrences(of: p, with: "", options: [.regularExpression, .caseInsensitive])
        }
        r = r.replacingOccurrences(of: "[^\\w\\s]", with: "", options: .regularExpression)
        r = r.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        return r
    }

    static func cleanName(_ s: String) -> String {
        var r = String(s.unicodeScalars.filter { !(0x2460...0x24FF ~= $0.value) && $0.value != 0x2605 })
        r = r.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        return r
    }
}
