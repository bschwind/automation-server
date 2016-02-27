create table if not exists air_con_history (
   id integer primary key autoincrement not null,
   time_sent integer not null,
   mode text not null, -- HEAT, DEHUMIDIFY, COOL
   temperature integer not null,
   fan_speed text not null, -- AUTO, STRONG, WEAK, VERY_WEAK
   power_status text not null -- ON, OFF
);

insert into air_con_history (time_sent, mode, temperature, fan_speed, power_status) values (1456582477, "HEAT", 20, "AUTO", "OFF");
