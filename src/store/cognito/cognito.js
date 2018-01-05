import {CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute} from 'amazon-cognito-identity-js'

import AWS from 'aws-sdk/global'

import { USER_POOL_ID, USER_POOL_APP_CLIENT, AWS_REGION } from '../../globals/resources'

import UserService from '../../services/UserService.vue'
console.log(UserService)

function handleResults(err, result, success, failure) {
  if (err) {
    console.error(err)
    return failure(err)
  } else {
    return success(result)
  }
}

const config = {
  // TODO: Move this to a config file
  region: AWS_REGION,
  userPoolId: USER_POOL_ID,
  clientId: USER_POOL_APP_CLIENT
}

const state = {
  userPool: new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.clientId
  }),
  userId: null
}

console.log(state.userPool)

const getters = {
  /*getUsername: (state) => {
    return state.username
  }
  getUserAttributes: (state) => {
    return state.userAttributes
  }*/
}

const mutations = {
  setUserId: (state, payload) => {
    state.userId = payload
  },
  setUsername: (state, payload) => {
    state.username = payload
  }
}

const actions = {
  updateUserActivity({commit, state}) { 
    UserService.methods.updateUserActivity(state.userSession.getIdToken().getJwtToken(), state.username)
  },
  getIdToken({commit, state}) {
    //console.log('running getIdToken')
    return new Promise((resolve, reject) => {
      let user = state.userPool.getCurrentUser();
      if (user) {
        user.getSession((err, session) => {
          if (err) return reject(err)
          resolve(session.getIdToken().getJwtToken())
        })
      } else {
        reject(new Error('user is not logged in'))
      }
    })
  },
  isAuthenticated({commit, state}) {
    return new Promise((resolve, reject) => {
      let user = state.userPool.getCurrentUser();
      //console.log('function is running');
      if (user) {
        user.getSession((err, session) => {
          if (err) {
            resolve(false)
            return
          }
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: config.identityPoolId,
          })
          resolve(true)
        })
      } else {
        resolve(false);
      }
    })
  },
  signIn({commit, dispatch, state}, {username, pass}) {
    let authenticationDetails = new AuthenticationDetails({
      Username: username,
      Password: pass
    })
    let cognitoUser = new CognitoUser({
      Username: username,
      Pool: state.userPool
    })
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
          console.log('log in successful')
          dispatch('setUserId').then(() => {
            resolve(session)
          })
        },
        onFailure: (err) => {
          console.error(err);
          reject(err);
        }
      })
    })
  },
  signUp({commit, state}, user) {
    //console.log('running user signup')
    return new Promise((resolve, reject) => {
      //console.log(user)
      let attributeList = [
        new CognitoUserAttribute({
          Name: 'email',
          Value: user.email
        })
      ]

      state.userPool.signUp(user.username, user.pass, attributeList, null, (err, result) => {
        return handleResults(err, result, resolve, reject)
      })
    })
  },
  confirmRegistration({commit, state}, {username, code}) {
    let cognitoUser = new CognitoUser({
      Username: username,
      Pool: state.userPool
    })
    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        return handleResults(err, result, resolve, reject)
      })
    })
  },
  resendConfirmationCode({commit, state}, username) {
    let cognitoUser = new CognitoUser({
      Username: username,
      Pool: state.userPool
    })
    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((err, result) => {
        return handleResults(err, result, resolve, reject)
      })
    })
  },
  signOut({commit, state}) {
    let user = state.userPool.getCurrentUser();
    if (!user) {
      return
    }
    return user.signOut()
  },
  setUserId({commit, state}) {
    console.log('setting user id...')
    let user = state.userPool.getCurrentUser()
    return new Promise((resolve, reject) => {
      user.getSession((err, session) => {
        if (err) {
          return reject(err)
        }
        user.getUserAttributes((err, attributes) => {
          if (err) {
            return reject(err)
          }
          commit('setUserId', attributes.find((i) => {
            return i.Name === 'sub'
          }).Value)
          console.log(state.userId)
          resolve(state.userId)
        })
      })
    })
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}