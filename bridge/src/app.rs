use std::path::{Path, PathBuf};
use tokio_core::reactor::{Handle};
use tokio_timer::Timer;
use web3::Transport;
use error::{Error, ResultExt, ErrorKind};
use config::Config;
use contracts::{home, foreign};
use web3::transports::http::Http;

use std::sync::Arc;
use std::sync::atomic::AtomicBool;

pub struct App<T> where T: Transport {
	pub config: Config,
	pub database_path: PathBuf,
	pub connections: Connections<T>,
	pub home_bridge: home::HomeBridge,
	pub foreign_bridge: foreign::ForeignBridge,
	pub timer: Timer,
	pub running: Arc<AtomicBool>
}

pub struct Connections<T> where T: Transport {
	pub home: T,
	pub foreign: T,
}

impl Connections<Http>  {
	pub fn new_http(handle: &Handle, home: &str, foreign: &str) -> Result<Self, Error> {

	    let home = Http::with_event_loop(home, handle,1)
			.map_err(ErrorKind::Web3)
			.map_err(Error::from)
			.chain_err(||"Cannot connect to home node rpc")?;
		let foreign = Http::with_event_loop(foreign, handle, 1)
			.map_err(ErrorKind::Web3)
			.map_err(Error::from)
			.chain_err(||"Cannot connect to foreign node rpc")?;

		let result = Connections {
			home,
			foreign
		};
		Ok(result)
	}
}

impl<T: Transport> Connections<T> {
	pub fn as_ref(&self) -> Connections<&T> {
		Connections {
			home: &self.home,
			foreign: &self.foreign,
		}
	}
}

impl App<Http> {
	pub fn new_http<P: AsRef<Path>>(config: Config, database_path: P, handle: &Handle, running: Arc<AtomicBool>) -> Result<Self, Error> {
		let home_url:String = format!("{}:{}", config.home.rpc_host, config.home.rpc_port);
		let foreign_url:String = format!("{}:{}", config.foreign.rpc_host, config.foreign.rpc_port);

		let connections = Connections::new_http(handle, home_url.as_ref(), foreign_url.as_ref())?;
		let result = App {
			config,
			database_path: database_path.as_ref().to_path_buf(),
			connections,
			home_bridge: home::HomeBridge::default(),
			foreign_bridge: foreign::ForeignBridge::default(),
			timer: Timer::default(),
			running,
		};
		Ok(result)
	}
}
