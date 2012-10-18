# encoding: utf-8
require 'sinatra'
require 'rack/cache'
require 'sinatra/reloader'

configure do
  set :static_cache_control => [:public, :max_age => 86400*3]
end

get '/' do
  cache_control :public, max_age: 86400*3  # 3 day
  erb :index
end
