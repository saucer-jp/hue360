# encoding: utf-8
require 'sinatra'
require 'rack/cache'
require 'sinatra/reloader'

get '/' do
  cache_control :public, max_age: 1800  # 30 mins.
  erb :index
end
