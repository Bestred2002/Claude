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

    static let defaultTV: [Station] = [
        .init(name: "Rai 1",         streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Rai_1_-_Logo_2016.svg/200px-Rai_1_-_Logo_2016.svg.png"),
        .init(name: "Rai 2",         streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Rai_2_-_Logo_2016.svg/200px-Rai_2_-_Logo_2016.svg.png"),
        .init(name: "Rai 3",         streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Rai_3_-_Logo_2016.svg/200px-Rai_3_-_Logo_2016.svg.png"),
        .init(name: "Rete 4",        streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Rete_4_-_Logo_2018.svg/200px-Rete_4_-_Logo_2018.svg.png"),
        .init(name: "Canale 5",      streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Canale_5_-_Logo_2018.svg/200px-Canale_5_-_Logo_2018.svg.png"),
        .init(name: "Italia 1",      streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Italia_1_-_Logo_2018.svg/200px-Italia_1_-_Logo_2018.svg.png"),
        .init(name: "La7",           streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/La7_-_Logo_2011.svg/200px-La7_-_Logo_2011.svg.png"),
        .init(name: "TV8",           streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/TV8_-_Logo_2016.svg/200px-TV8_-_Logo_2016.svg.png"),
        .init(name: "Nove",          streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Nove_-_Logo_2016.svg/200px-Nove_-_Logo_2016.svg.png"),
        .init(name: "Real Time",     streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Real_Time_logo_2017.svg/200px-Real_Time_logo_2017.svg.png"),
        .init(name: "DMAX",          streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/DMAX_-_Logo_2016.svg/200px-DMAX_-_Logo_2016.svg.png"),
        .init(name: "Mediaset Extra",streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Mediaset_Extra_-_Logo_2018.svg/200px-Mediaset_Extra_-_Logo_2018.svg.png"),
        .init(name: "Cine34",        streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Cine34_-_Logo.svg/200px-Cine34_-_Logo.svg.png"),
        .init(name: "Focus",         streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Focus_-_Logo_2018.svg/200px-Focus_-_Logo_2018.svg.png"),
        .init(name: "RTL 102.5 TV",  streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/RTL_102.5_-_Logo_2017.svg/200px-RTL_102.5_-_Logo_2017.svg.png"),
        .init(name: "Rai News 24",   streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Rai_News_24_-_Logo_2017.svg/200px-Rai_News_24_-_Logo_2017.svg.png"),
        .init(name: "Sky TG24",      streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Sky_TG24_-_Logo_2021.svg/200px-Sky_TG24_-_Logo_2021.svg.png"),
        .init(name: "TGCom24",       streamURL: "", logoURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/TGCom24_-_Logo_2018.svg/200px-TGCom24_-_Logo_2018.svg.png"),
    ]
}
